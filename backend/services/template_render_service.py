"""
Template Render Service
───────────────────────
Server-side template rendering engine.
Handles variable injection, HTML sanitization, conditional blocks,
reprint detection, and ESCPOS command generation.
Target: < 200ms render time.
"""
import re
import hashlib
import html as html_module
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import logging

logger = logging.getLogger("restin.template.render")

# ==================== HTML SANITIZATION ====================

# Allow-list for CSS properties (prevent injection)
SAFE_CSS_PROPERTIES = {
    "font-size", "font-weight", "font-style", "text-align",
    "text-decoration", "color", "background-color", "border",
    "border-bottom", "border-top", "padding", "margin",
    "width", "height", "max-width", "display", "line-height"
}

# Blocked HTML tags
BLOCKED_TAGS = {"script", "iframe", "object", "embed", "form", "input", "link", "meta"}


def sanitize_html(raw: str) -> str:
    """
    Remove dangerous HTML elements while preserving safe formatting.
    Block <script>, <iframe>, etc.
    """
    for tag in BLOCKED_TAGS:
        raw = re.sub(rf'<{tag}[^>]*>.*?</{tag}>', '', raw, flags=re.IGNORECASE | re.DOTALL)
        raw = re.sub(rf'<{tag}[^>]*/>', '', raw, flags=re.IGNORECASE)
    # Remove event handlers
    raw = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', raw, flags=re.IGNORECASE)
    return raw


# ==================== VARIABLE INJECTION ====================

def resolve_variable(path: str, data: Dict[str, Any]) -> Any:
    """
    Resolve a dotted path like 'order.total' from nested dict.
    Returns empty string if path doesn't exist.
    """
    parts = path.strip().split(".")
    current = data
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            idx = int(part)
            current = current[idx] if idx < len(current) else None
        else:
            return ""
        if current is None:
            return ""
    return current


def inject_variables(template_str: str, data: Dict[str, Any]) -> str:
    """
    Replace {{variable.path}} placeholders with actual values.
    Escapes HTML in injected values to prevent XSS.
    """
    def replacer(match: re.Match) -> str:
        var_path = match.group(1).strip()
        value = resolve_variable(var_path, data)
        if value is None or value == "":
            return ""
        return html_module.escape(str(value))

    return re.sub(r'\{\{(.+?)\}\}', replacer, template_str)


# ==================== CONDITIONAL EVALUATION ====================

def evaluate_condition(condition: Optional[Dict], data: Dict[str, Any]) -> bool:
    """
    Evaluate a show_if condition against provided data.
    Returns True if block should be shown.
    """
    if not condition:
        return True  # No condition = always show

    field = condition.get("field", "")
    operator = condition.get("operator", "==")
    expected = condition.get("value")
    actual = resolve_variable(field, data)

    try:
        if operator == "==":
            return actual == expected
        elif operator == "!=":
            return actual != expected
        elif operator == ">":
            return float(actual) > float(expected)
        elif operator == "<":
            return float(actual) < float(expected)
        elif operator == ">=":
            return float(actual) >= float(expected)
        elif operator == "<=":
            return float(actual) <= float(expected)
        elif operator == "in":
            return actual in (expected if isinstance(expected, list) else [expected])
        elif operator == "not_in":
            return actual not in (expected if isinstance(expected, list) else [expected])
        elif operator == "exists":
            return actual != "" and actual is not None
        else:
            return True
    except (ValueError, TypeError):
        return True  # On error, show the block


# ==================== REPRINT DETECTION ====================

async def check_reprint(db, order_id: str, venue_id: str) -> Tuple[bool, int]:
    """
    Check if this order has been printed before.
    Returns (is_reprint, print_count).
    """
    if not order_id:
        return False, 0

    record = await db.template_print_log.find_one(
        {"order_id": order_id, "venue_id": venue_id},
        {"_id": 0, "print_count": 1}
    )

    count = record.get("print_count", 0) if record else 0

    # Increment counter
    await db.template_print_log.update_one(
        {"order_id": order_id, "venue_id": venue_id},
        {
            "$inc": {"print_count": 1},
            "$set": {"last_printed_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {
                "order_id": order_id,
                "venue_id": venue_id,
                "first_printed_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return count > 0, count + 1


# ==================== BLOCK RENDERERS ====================

def render_text_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render a text block to HTML"""
    props = block.get("text_props", {})
    content = props.get("content", "")

    # If it has a variable reference, resolve it
    variable = props.get("variable")
    if variable:
        content = inject_variables(variable, data)
    else:
        content = inject_variables(content, data)

    styles = []
    if props.get("font_size"):
        styles.append(f"font-size: {props['font_size']}px")
    if props.get("bold"):
        styles.append("font-weight: bold")
    if props.get("italic"):
        styles.append("font-style: italic")
    if props.get("underline"):
        styles.append("text-decoration: underline")
    if props.get("alignment"):
        styles.append(f"text-align: {props['alignment']}")

    style_str = "; ".join(styles)
    return f'<div class="template-text" style="{style_str}">{content}</div>'


def render_image_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render an image block to HTML"""
    props = block.get("image_props", {})
    url = props.get("url", "")
    width = props.get("width", 200)
    alignment = props.get("alignment", "center")

    if not url:
        return ""

    styles = [f"width: {width}px", f"text-align: {alignment}"]
    return f'<div class="template-image" style="{"; ".join(styles)}"><img src="{html_module.escape(url)}" alt="template-asset" style="max-width: 100%;" /></div>'


def render_table_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render a table block (e.g., order items) to HTML"""
    props = block.get("table_props", {})
    columns = props.get("columns", [])
    data_source = props.get("data_source", "order.items")
    show_header = props.get("show_header", True)
    show_totals = props.get("show_totals", True)
    totals_row = props.get("totals_row", {})

    rows = resolve_variable(data_source, data)
    if not isinstance(rows, list):
        rows = []

    html_parts = ['<table class="template-table" style="width: 100%; border-collapse: collapse;">']

    # Header
    if show_header and columns:
        html_parts.append("<thead><tr>")
        for col in columns:
            align = col.get("align", "left")
            html_parts.append(f'<th style="text-align: {align}; border-bottom: 1px solid #333; padding: 2px 4px;">{html_module.escape(col.get("label", ""))}</th>')
        html_parts.append("</tr></thead>")

    # Body
    html_parts.append("<tbody>")
    for row in rows:
        html_parts.append("<tr>")
        for col in columns:
            key = col.get("key", "")
            align = col.get("align", "left")
            value = row.get(key, "") if isinstance(row, dict) else ""
            html_parts.append(f'<td style="text-align: {align}; padding: 2px 4px;">{html_module.escape(str(value))}</td>')
        html_parts.append("</tr>")
    html_parts.append("</tbody>")

    # Totals row
    if show_totals and totals_row:
        html_parts.append("<tfoot><tr>")
        for col in columns:
            key = col.get("key", "")
            if key in totals_row:
                value = inject_variables(totals_row[key], data)
                html_parts.append(f'<td style="font-weight: bold; border-top: 1px solid #333; padding: 2px 4px;">{value}</td>')
            else:
                html_parts.append("<td></td>")
        html_parts.append("</tr></tfoot>")

    html_parts.append("</table>")
    return "\n".join(html_parts)


def render_divider_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render a divider/separator"""
    props = block.get("divider_props", {})
    style = props.get("style", "solid")
    thickness = props.get("thickness", 1)

    if style == "dashed":
        border_style = "dashed"
    elif style == "dotted":
        border_style = "dotted"
    elif style == "double":
        border_style = "double"
    else:
        border_style = "solid"

    return f'<hr class="template-divider" style="border: none; border-top: {thickness}px {border_style} #333; margin: 4px 0;" />'


def render_barcode_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render a barcode placeholder (actual barcode generation done client-side or via library)"""
    props = block.get("barcode_props", {})
    data_source = props.get("data_source", "order.id")
    barcode_value = resolve_variable(data_source, data)
    barcode_format = props.get("format", "CODE128")
    height = props.get("height", 60)
    show_text = props.get("show_text", True)

    return f'<div class="template-barcode" data-value="{html_module.escape(str(barcode_value))}" data-format="{barcode_format}" data-height="{height}" data-show-text="{str(show_text).lower()}" style="text-align: center; padding: 4px 0;"><div style="font-family: monospace; font-size: 10px;">||||| {html_module.escape(str(barcode_value))} |||||</div></div>'


def render_qr_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render QR code placeholder"""
    props = block.get("qr_props", {})
    data_source = props.get("data_source", "order.payment_url")
    static_url = props.get("static_url")
    qr_value = static_url or resolve_variable(data_source, data)
    size = props.get("size", 150)
    label = props.get("label", "")

    parts = [f'<div class="template-qr" data-value="{html_module.escape(str(qr_value))}" data-size="{size}" style="text-align: center; padding: 8px 0;">']
    parts.append(f'<div style="width: {size}px; height: {size}px; border: 2px solid #333; display: inline-block; font-size: 10px; line-height: {size}px;">QR</div>')
    if label:
        parts.append(f'<div style="font-size: 10px; text-align: center;">{html_module.escape(label)}</div>')
    parts.append("</div>")
    return "\n".join(parts)


def render_fiscal_block(block: Dict, data: Dict[str, Any]) -> str:
    """Render fiscal compliance block"""
    props = block.get("fiscal_props", {})
    fiscal_id = resolve_variable(props.get("fiscal_id_variable", "fiscal.receipt_id"), data)
    fiscal_qr = resolve_variable(props.get("fiscal_qr_variable", "fiscal.qr_data"), data)

    parts = ['<div class="template-fiscal" style="border: 1px solid #333; padding: 4px; margin: 4px 0; font-size: 10px;">']
    if props.get("show_fiscal_id", True) and fiscal_id:
        parts.append(f'<div>Fiscal ID: {html_module.escape(str(fiscal_id))}</div>')
    if props.get("show_fiscal_qr", True) and fiscal_qr:
        parts.append(f'<div class="template-qr" data-value="{html_module.escape(str(fiscal_qr))}" data-size="80" style="text-align: center;">QR</div>')
    parts.append("</div>")
    return "\n".join(parts)


# Block type → renderer mapping
BLOCK_RENDERERS = {
    "text": render_text_block,
    "image": render_image_block,
    "table": render_table_block,
    "divider": render_divider_block,
    "barcode": render_barcode_block,
    "qr": render_qr_block,
    "fiscal": render_fiscal_block,
}


# ==================== REPRINT WATERMARK ====================

REPRINT_WATERMARK_HTML = """
<div class="reprint-watermark" style="
    position: relative; text-align: center; padding: 8px;
    background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px);
">
    <div style="font-size: 24px; font-weight: bold; color: #999; letter-spacing: 4px;">
        ⚠ COPY / REPRINT ⚠
    </div>
    <div style="font-size: 10px; color: #999;">
        Print #{print_count} — {timestamp}
    </div>
</div>
"""


# ==================== MAIN RENDER ENGINE ====================

async def render_template(
    db,
    template_doc: Dict,
    data: Dict[str, Any],
    version: Optional[int] = None,
    order_id: Optional[str] = None,
    venue_id: str = "",
    output_format: str = "html",
    debug: bool = False
) -> Dict[str, Any]:
    """
    Main render function. Takes a template and data, returns rendered output.
    
    Performance target: < 200ms
    """
    import time
    start_time = time.monotonic()
    warnings: List[str] = []

    # 1. Resolve which version to render
    blocks = template_doc.get("blocks", [])
    paper = template_doc.get("paper_profile", {})

    if version is not None:
        versions = template_doc.get("versions", [])
        target_version = next((v for v in versions if v.get("version") == version), None)
        if target_version:
            blocks = target_version.get("blocks", blocks)
            paper = target_version.get("paper_profile", paper)
        else:
            warnings.append(f"Version {version} not found, using current draft")

    # 2. Reprint detection
    is_reprint = False
    reprint_count = 0
    if order_id:
        is_reprint, reprint_count = await check_reprint(db, order_id, venue_id)

    # 3. Filter blocks by condition and sort by order
    visible_blocks = []
    for block in blocks:
        condition = block.get("show_if")
        if evaluate_condition(condition, data):
            visible_blocks.append(block)
    visible_blocks.sort(key=lambda b: b.get("order", 0))

    # 4. Group by section
    sections = {"header": [], "body": [], "footer": []}
    for block in visible_blocks:
        section = block.get("section", "body")
        sections.setdefault(section, []).append(block)

    # 5. Render each block
    if output_format == "html":
        result = render_to_html(sections, data, paper, is_reprint, reprint_count)
    else:
        # ESCPOS rendering (placeholder — actual binary generation would use python-escpos)
        result = {"html": render_to_html(sections, data, paper, is_reprint, reprint_count)["html"]}
        warnings.append("ESCPOS output not yet implemented, returning HTML")

    elapsed = (time.monotonic() - start_time) * 1000

    if debug:
        result["debug"] = {
            "total_blocks": len(blocks),
            "visible_blocks": len(visible_blocks),
            "variables_injected": list(data.keys()),
            "paper_profile": paper,
            "version_used": version or "draft"
        }

    result["render_time_ms"] = round(elapsed, 2)
    result["is_reprint"] = is_reprint
    result["reprint_count"] = reprint_count
    result["warnings"] = warnings

    return result


def render_to_html(
    sections: Dict[str, List[Dict]],
    data: Dict[str, Any],
    paper: Dict,
    is_reprint: bool,
    reprint_count: int
) -> Dict[str, str]:
    """Render blocks to styled HTML document"""
    width = paper.get("width", "80mm")
    width_px = 576 if width == "80mm" else 384  # Approximate at 203dpi
    margin_left = paper.get("margin_left", 4)
    margin_right = paper.get("margin_right", 4)
    margin_top = paper.get("margin_top", 2)

    html_parts = [f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: {width_px}px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
    padding: {margin_top}mm {margin_right}mm 2mm {margin_left}mm;
  }}
  .section {{ margin-bottom: 4px; }}
  .template-table {{ font-size: 11px; }}
</style>
</head>
<body>"""]

    # Reprint watermark at top
    if is_reprint:
        watermark = REPRINT_WATERMARK_HTML.replace("{print_count}", str(reprint_count))
        watermark = watermark.replace("{timestamp}", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"))
        html_parts.append(watermark)

    for section_name in ["header", "body", "footer"]:
        blocks = sections.get(section_name, [])
        if not blocks:
            continue
        html_parts.append(f'<div class="section section-{section_name}">')
        for block in blocks:
            block_type = block.get("type", "text")
            renderer = BLOCK_RENDERERS.get(block_type)
            if renderer:
                try:
                    rendered = renderer(block, data)
                    html_parts.append(sanitize_html(rendered))
                except Exception as e:
                    logger.error(f"Block render error: {e}", exc_info=True)
                    html_parts.append(f'<!-- Block render error: {block.get("id", "unknown")} -->')
        html_parts.append("</div>")

    # Reprint watermark at bottom too
    if is_reprint:
        html_parts.append(watermark)

    html_parts.append("</body></html>")
    return {"html": "\n".join(html_parts)}


def compute_content_hash(blocks: List[Dict]) -> str:
    """Compute SHA256 hash of blocks for version integrity"""
    import json
    content_str = json.dumps(blocks, sort_keys=True, default=str)
    return hashlib.sha256(content_str.encode()).hexdigest()
