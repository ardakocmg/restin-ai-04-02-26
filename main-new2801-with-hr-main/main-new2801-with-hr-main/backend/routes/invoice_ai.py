"""AI Invoice Processing Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.invoice_ai import AIInvoice, InvoiceOCRRequest, InvoiceStatus
from services.invoice_ocr_service import invoice_ocr_service


def create_invoice_ai_router():
    router = APIRouter(tags=["invoice_ai"])
    
    @router.post("/venues/{venue_id}/invoices/ocr")
    async def process_invoice_ocr(
        venue_id: str,
        request: InvoiceOCRRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Get PO data if provided
        po_data = None
        if request.po_id:
            po_data = await db.PurchaseOrders.find_one({"id": request.po_id}, {"_id": 0})
        
        # Process OCR
        result = await invoice_ocr_service.process_invoice(request.image_base64, po_data)
        
        invoice_data = result["invoice_data"]
        
        # Create AI invoice record
        ai_invoice = AIInvoice(
            venue_id=venue_id,
            invoice_number=invoice_data.get("invoice_number", "UNKNOWN"),
            supplier_name=invoice_data.get("supplier_name", "UNKNOWN"),
            invoice_date=invoice_data.get("invoice_date", ""),
            due_date=invoice_data.get("due_date"),
            total_amount=invoice_data.get("total", 0),
            tax_amount=invoice_data.get("tax", 0),
            line_items=invoice_data.get("line_items", []),
            status=InvoiceStatus.OCR_COMPLETE,
            po_id=request.po_id,
            variances=result.get("variances", []),
            ocr_confidence=result.get("ocr_confidence", 0.85),
            ocr_raw_text=str(invoice_data),
            image_base64=request.image_base64,
            processed_by_ai=True,
            ai_model="gpt-5.1"
        )
        
        # Determine status based on variances
        if ai_invoice.variances:
            ai_invoice.status = InvoiceStatus.VARIANCE_DETECTED
        elif request.po_id:
            ai_invoice.status = InvoiceStatus.MATCHED
        
        await db.AIInvoices.insert_one(ai_invoice.model_dump())
        
        return ai_invoice.model_dump()
    
    @router.get("/venues/{venue_id}/invoices/ai")
    async def list_ai_invoices(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        invoices = await db.AIInvoices.find(query, {"_id": 0, "image_base64": 0}).to_list(1000)
        return invoices
    
    @router.get("/venues/{venue_id}/invoices/ai/{invoice_id}")
    async def get_ai_invoice(
        venue_id: str,
        invoice_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        invoice = await db.AIInvoices.find_one(
            {"id": invoice_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not invoice:
            raise HTTPException(404, "Invoice not found")
        
        return invoice
    
    @router.post("/venues/{venue_id}/invoices/ai/{invoice_id}/approve")
    async def approve_invoice(
        venue_id: str,
        invoice_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.AIInvoices.update_one(
            {"id": invoice_id, "venue_id": venue_id},
            {"$set": {"status": "approved"}}
        )
        
        return {"message": "Invoice approved"}
    
    @router.post("/venues/{venue_id}/invoices/ai/{invoice_id}/reject")
    async def reject_invoice(
        venue_id: str,
        invoice_id: str,
        reason: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.AIInvoices.update_one(
            {"id": invoice_id, "venue_id": venue_id},
            {"$set": {"status": "rejected"}}
        )
        
        return {"message": "Invoice rejected"}
    
    return router
