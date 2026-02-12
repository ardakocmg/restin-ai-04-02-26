"""
Template Wizard — Data Models
─────────────────────────────
Pydantic models for receipt/ticket template design, versioning, and rendering.
Follows existing patterns from hr_models.py and employee_detail.py.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


# ==================== ENUMS ====================

class PaperWidth(str, Enum):
    NARROW = "58mm"
    WIDE = "80mm"
    EXTRA_WIDE = "112mm"
    A4 = "A4"
    A5 = "A5"
    LETTER = "Letter"
    LABEL_100X50 = "Label100x50"
    LABEL_62 = "Label62"
    CUSTOM = "custom"


class TemplateStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class TemplateType(str, Enum):
    RECEIPT = "receipt"
    KOT = "kot"  # Kitchen Order Ticket
    INVOICE = "invoice"
    REPORT = "report"
    LABEL = "label"
    CUSTOM = "custom"


class BlockType(str, Enum):
    # Header blocks
    LOGO = "logo"
    VENUE_INFO = "venue_info"
    DOCUMENT_TITLE = "document_title"
    QR_BARCODE = "qr_barcode"
    # Content blocks
    TEXT = "text"
    IMAGE = "image"
    TABLE = "table"
    ITEMS_LIST = "items_list"
    GROUPED_ITEMS = "grouped_items"
    NOTES = "notes"
    DISCOUNTS_CHARGES = "discounts_charges"
    PAYMENT_SUMMARY = "payment_summary"
    DIVIDER = "divider"
    BARCODE = "barcode"
    QR = "qr"
    FISCAL = "fiscal"  # Reserved for fiscal ID/QR injection
    # Footer blocks
    THANK_YOU = "thank_you"
    LEGAL_FOOTER = "legal_footer"
    SIGNATURE_LINE = "signature_line"


class AssetStatus(str, Enum):
    SCANNING = "scanning"
    SAFE = "safe"
    REJECTED = "rejected"


# ==================== PAPER PROFILE ====================

class PaperProfile(BaseModel):
    """Printer paper configuration"""
    width: PaperWidth = PaperWidth.WIDE
    margin_left: int = Field(default=4, ge=0, le=20, description="Left margin in mm")
    margin_right: int = Field(default=4, ge=0, le=20, description="Right margin in mm")
    margin_top: int = Field(default=2, ge=0, le=20, description="Top margin in mm")
    margin_bottom: int = Field(default=2, ge=0, le=20, description="Bottom margin in mm")
    cut_feed: int = Field(default=4, ge=0, le=20, description="Feed lines before cut")
    dpi: int = Field(default=203, description="Printer DPI (203 or 300)")


# ==================== CONDITIONAL LOGIC ====================

class BlockCondition(BaseModel):
    """Conditional visibility for a block"""
    field: str = Field(..., description="Variable path, e.g. 'order.type'")
    operator: str = Field(default="==", description="Comparison operator: ==, !=, >, <, in, not_in, exists")
    value: Any = Field(default=None, description="Expected value for comparison")


# ==================== TEMPLATE BLOCKS ====================

class TextProperties(BaseModel):
    content: str = ""
    font_size: int = Field(default=12, ge=6, le=48)
    bold: bool = False
    italic: bool = False
    underline: bool = False
    alignment: str = Field(default="left", description="left | center | right")
    variable: Optional[str] = Field(default=None, description="Variable reference, e.g. '{{venue.name}}'")


class ImageProperties(BaseModel):
    asset_id: Optional[str] = None
    url: Optional[str] = None
    width: int = Field(default=200, ge=20, le=576)
    height: Optional[int] = None
    alignment: str = "center"
    dithering: bool = True


class TableProperties(BaseModel):
    """Used for order items, ingredients, etc."""
    columns: List[Dict[str, str]] = Field(default_factory=list, description="Column definitions [{key, label, width, align}]")
    data_source: str = Field(default="order.items", description="Variable path for row data")
    show_header: bool = True
    show_totals: bool = True
    totals_row: Optional[Dict[str, str]] = None


class DividerProperties(BaseModel):
    style: str = Field(default="solid", description="solid | dashed | dotted | double")
    thickness: int = Field(default=1, ge=1, le=4)


class BarcodeProperties(BaseModel):
    data_source: str = Field(default="order.id", description="Variable for barcode value")
    format: str = Field(default="CODE128", description="CODE128, EAN13, QR")
    height: int = Field(default=60, ge=20, le=200)
    width: int = Field(default=2, ge=1, le=4, description="Bar width multiplier")
    show_text: bool = True


class QRProperties(BaseModel):
    data_source: str = Field(default="order.payment_url", description="Variable or static URL")
    static_url: Optional[str] = None
    size: int = Field(default=150, ge=50, le=300)
    error_correction: str = Field(default="M", description="L, M, Q, H")
    label: Optional[str] = None


class FiscalProperties(BaseModel):
    """Reserved block for fiscal compliance injection"""
    fiscal_id_variable: str = "fiscal.receipt_id"
    fiscal_qr_variable: str = "fiscal.qr_data"
    show_fiscal_id: bool = True
    show_fiscal_qr: bool = True


# ==================== TEMPLATE BLOCK (POLYMORPHIC) ====================

class TemplateBlock(BaseModel):
    """Single block in the template layout"""
    id: str = Field(..., description="Unique block ID within template")
    type: BlockType
    label: Optional[str] = Field(default=None, description="Human-readable label for editor")
    order: int = Field(default=0, description="Sort order in layout")
    section: str = Field(default="body", description="header | body | footer")
    show_if: Optional[BlockCondition] = None
    # Polymorphic properties — only one should be populated based on type
    text_props: Optional[TextProperties] = None
    image_props: Optional[ImageProperties] = None
    table_props: Optional[TableProperties] = None
    divider_props: Optional[DividerProperties] = None
    barcode_props: Optional[BarcodeProperties] = None
    qr_props: Optional[QRProperties] = None
    fiscal_props: Optional[FiscalProperties] = None


# ==================== TEMPLATE VERSION (IMMUTABLE SNAPSHOT) ====================

class TemplateVersion(BaseModel):
    """Immutable published snapshot of a template"""
    version: int = Field(default=1, ge=1)
    blocks: List[TemplateBlock] = []
    paper_profile: PaperProfile = Field(default_factory=PaperProfile)
    content_hash: str = Field(default="", description="SHA256 of serialized blocks for integrity")
    published_at: str = ""
    published_by: str = ""
    publish_request_id: Optional[str] = Field(default=None, description="Idempotency key")
    notes: Optional[str] = None


# ==================== MAIN TEMPLATE DOCUMENT ====================

class Template(BaseModel):
    """Full template document stored in MongoDB"""
    id: str = Field(...)
    venue_id: str
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    type: TemplateType = TemplateType.RECEIPT
    status: TemplateStatus = TemplateStatus.DRAFT
    schema_version: int = Field(default=1, description="Schema version for backward compatibility")

    # Design
    blocks: List[TemplateBlock] = []
    paper_profile: PaperProfile = Field(default_factory=PaperProfile)
    variables_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON schema for injectable variables")

    # Versioning
    current_version: int = Field(default=0, description="Latest published version number")
    versions: List[TemplateVersion] = []

    # Metadata
    created_at: str = ""
    updated_at: str = ""
    created_by: str = ""
    updated_by: str = ""

    # Fiscal
    has_fiscal_block: bool = Field(default=False, description="Whether template contains fiscal compliance block")

    # Tags
    tags: List[str] = []


# ==================== TEMPLATE ASSET ====================

class TemplateAsset(BaseModel):
    """Uploaded image/logo for use in templates"""
    id: str = Field(...)
    venue_id: str
    filename: str
    original_filename: str
    mime_type: str = Field(default="image/png", description="image/png or image/jpeg")
    size_bytes: int = Field(default=0, le=512_000, description="Max 500KB")
    storage_key: str = Field(default="", description="S3/GCS path")
    url: str = ""
    status: AssetStatus = AssetStatus.SCANNING
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: str = ""
    uploaded_by: str = ""


# ==================== RENDER REQUEST/RESPONSE ====================

class RenderRequest(BaseModel):
    """Request to render a template with data"""
    template_id: str
    venue_id: str
    version: Optional[int] = Field(default=None, description="Specific version, or latest if None")
    data: Dict[str, Any] = Field(default_factory=dict, description="Variables to inject")
    output_format: str = Field(default="html", description="html | escpos")
    order_id: Optional[str] = Field(default=None, description="Track prints for reprint detection")
    debug: bool = False


class RenderResponse(BaseModel):
    """Rendered template output"""
    html: Optional[str] = None
    escpos_commands: Optional[List[int]] = None
    render_time_ms: float = 0
    is_reprint: bool = False
    reprint_count: int = 0
    warnings: List[str] = []
