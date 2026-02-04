from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class PosPayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    venue_id: str
    tender_type: str  # CASH|CARD|OTHER
    amount: float
    status: str = "INITIATED"  # INITIATED|COMPLETED|VOIDED|FAILED
    external_ref: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str

class PosPaymentCreate(BaseModel):
    order_id: str
    venue_id: str
    tender_type: str
    amount: float
    external_ref: Optional[str] = None
