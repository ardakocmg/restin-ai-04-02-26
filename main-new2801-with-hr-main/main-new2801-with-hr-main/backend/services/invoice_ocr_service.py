"""Invoice OCR Processing Service"""
import json
from typing import Dict, Any, Optional
from services.openai_integration import openai_service


class InvoiceOCRService:
    """Invoice OCR and variance detection"""
    
    async def process_invoice(self, image_base64: str, po_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process invoice with OCR and PO matching"""
        
        # OCR extraction
        ocr_result = await openai_service.analyze_invoice_image(image_base64)
        
        try:
            # Parse JSON from AI response
            ocr_text = ocr_result.get("ocr_result", "")
            # Try to extract JSON from response
            if "{" in ocr_text and "}" in ocr_text:
                start = ocr_text.index("{")
                end = ocr_text.rindex("}") + 1
                invoice_data = json.loads(ocr_text[start:end])
            else:
                invoice_data = {
                    "invoice_number": "UNKNOWN",
                    "supplier_name": "UNKNOWN",
                    "invoice_date": "",
                    "line_items": [],
                    "total": 0
                }
        except Exception as e:
            invoice_data = {
                "error": str(e),
                "raw_text": ocr_text
            }
        
        result = {
            "invoice_data": invoice_data,
            "ocr_confidence": 0.85,  # placeholder
            "variances": []
        }
        
        # If PO provided, detect variances
        if po_data and "line_items" in invoice_data:
            variances = self._detect_variances(po_data, invoice_data)
            result["variances"] = variances
        
        return result
    
    def _detect_variances(self, po_data: Dict[str, Any], invoice_data: Dict[str, Any]) -> list:
        """Detect variances between PO and invoice"""
        variances = []
        
        po_items = po_data.get("items", [])
        invoice_items = invoice_data.get("line_items", [])
        
        # Simple matching by description (in real scenario, use fuzzy matching)
        for inv_item in invoice_items:
            matched = False
            for po_item in po_items:
                # Basic string matching
                if inv_item.get("description", "").lower() in po_item.get("name", "").lower():
                    matched = True
                    
                    # Price variance
                    po_price = po_item.get("unit_price", 0)
                    inv_price = inv_item.get("unit_price", 0)
                    if abs(po_price - inv_price) > 0.01:
                        variance_pct = ((inv_price - po_price) / po_price * 100) if po_price > 0 else 0
                        variances.append({
                            "type": "price",
                            "item_description": inv_item["description"],
                            "po_price": po_price,
                            "invoice_price": inv_price,
                            "variance_amount": inv_price - po_price,
                            "variance_percentage": round(variance_pct, 2)
                        })
                    
                    # Quantity variance
                    po_qty = po_item.get("quantity", 0)
                    inv_qty = inv_item.get("quantity", 0)
                    if abs(po_qty - inv_qty) > 0.01:
                        variances.append({
                            "type": "quantity",
                            "item_description": inv_item["description"],
                            "po_quantity": po_qty,
                            "invoice_quantity": inv_qty,
                            "variance_amount": (inv_qty - po_qty) * inv_price
                        })
                    break
            
            if not matched:
                variances.append({
                    "type": "item_extra",
                    "item_description": inv_item.get("description", "UNKNOWN"),
                    "invoice_quantity": inv_item.get("quantity", 0),
                    "variance_amount": inv_item.get("total", 0)
                })
        
        return variances


invoice_ocr_service = InvoiceOCRService()
