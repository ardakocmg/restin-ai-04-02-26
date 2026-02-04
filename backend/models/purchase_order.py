"""Purchase Order model"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4


class POLine(BaseModel):
    sku_id: str
    sku_name: str
    supplier_sku: str
    qty_ordered: float
    qty_received: float = 0.0
    uom: str
    unit_price: float
    line_total: float


class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # PO-XXXXX
    venue_id: str
    supplier_id: str
    supplier_name: str = ""
    status: str = "DRAFT"  # DRAFT → SUBMITTED → APPROVED → SENT → PARTIAL_RECEIVED → RECEIVED_CLOSED
    lines: List[POLine] = []
    subtotal: float = 0.0
    vat_amount: float = 0.0
    total_amount: float = 0.0
    expected_delivery_date: Optional[str] = None
    notes: Optional[str] = None
    created_by: str = ""
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    sent_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PurchaseOrderCreate(BaseModel):
    venue_id: str
    supplier_id: str
    lines: List[dict]
    expected_delivery_date: Optional[str] = None
    notes: Optional[str] = None
