"""AI-Powered Invoice Processing Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class InvoiceStatus(str, Enum):
    PENDING = "pending"
    OCR_PROCESSING = "ocr_processing"
    OCR_COMPLETE = "ocr_complete"
    MATCHED = "matched"
    VARIANCE_DETECTED = "variance_detected"
    APPROVED = "approved"
    REJECTED = "rejected"


class VarianceType(str, Enum):
    PRICE = "price"
    QUANTITY = "quantity"
    ITEM_MISSING = "item_missing"
    ITEM_EXTRA = "item_extra"


class InvoiceLineItem(BaseModel):
    """Line item from OCR"""
    description: str
    quantity: float
    unit_price: float
    total: float
    matched_item_id: Optional[str] = None
    matched_po_line_id: Optional[str] = None


class VarianceItem(BaseModel):
    """Variance detected"""
    type: VarianceType
    item_description: str
    po_quantity: Optional[float] = None
    invoice_quantity: Optional[float] = None
    po_price: Optional[float] = None
    invoice_price: Optional[float] = None
    variance_amount: float
    variance_percentage: Optional[float] = None


class AIInvoice(BaseModel):
    """AI-processed invoice"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    invoice_number: str
    supplier_id: Optional[str] = None
    supplier_name: str
    invoice_date: str
    due_date: Optional[str] = None
    total_amount: float
    tax_amount: Optional[float] = None
    line_items: List[InvoiceLineItem]
    status: InvoiceStatus = InvoiceStatus.PENDING
    po_id: Optional[str] = None
    variances: List[VarianceItem] = []
    ocr_confidence: Optional[float] = None
    ocr_raw_text: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    processed_by_ai: bool = False
    ai_model: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class InvoiceOCRRequest(BaseModel):
    """Request to process invoice with OCR"""
    image_base64: str
    po_id: Optional[str] = None
