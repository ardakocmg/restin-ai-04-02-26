"""AP Payment Run model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class APPaymentRun(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # PAY-
    venue_id: str
    status: str = "DRAFT"  # DRAFT | APPROVED | LOCKED | EXPORTED
    payment_date: str
    payment_items: List[dict] = []  # [{"invoice_id": "...", "amount": 0}]
    total_amount: float = 0.0
    created_by: str
    approved_by: str = ""
    locked_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
