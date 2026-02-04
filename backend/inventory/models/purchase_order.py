from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class PurchaseOrderLine(BaseModel):
    item_id: str
    item_name: str
    qty: float
    unit: str
    unit_price: float
    line_total: float

class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: str
    venue_id: str
    supplier_id: str
    supplier_name: str
    status: str = "DRAFT"  # DRAFT|APPROVED|SENT|RECEIVED|CLOSED
    lines: List[PurchaseOrderLine] = []
    subtotal: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None

class PurchaseOrderCreate(BaseModel):
    venue_id: str
    supplier_id: str
    lines: List[PurchaseOrderLine]
