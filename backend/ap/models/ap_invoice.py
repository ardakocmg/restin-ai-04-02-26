"""AP Invoice model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class APInvoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # APINV-
    venue_id: str
    supplier_id: str
    invoice_no: str
    invoice_date: str
    due_date: str
    lines: List[dict] = []
    subtotal: float = 0.0
    vat: float = 0.0
    total: float = 0.0
    currency: str = "EUR"
    status: str = "DRAFT"  # DRAFT | APPROVED | PAID | CANCELLED
    payment_run_id: str = ""
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
