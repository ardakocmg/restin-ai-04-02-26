"""Payment Intent model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class PaymentIntent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    amount: float
    currency: str = "EUR"
    payment_method: str  # CARD | CASH | TRANSFER
    status: str = "PENDING"  # PENDING | CAPTURED | REFUNDED | FAILED
    external_transaction_id: str = ""
    linked_order_id: str = ""
    captured_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
