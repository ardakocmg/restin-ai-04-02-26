from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

class StockLedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: str
    location_id: str = "default"
    qty_delta: float
    unit: str
    cost_delta: float = 0.0
    currency: str = "EUR"
    reason: str
    ref_type: Optional[str] = None
    ref_id: Optional[str] = None
    occurred_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    actor_user_id: str
    request_id: Optional[str] = None

class StockLedgerEntryCreate(BaseModel):
    venue_id: str
    item_id: str
    qty_delta: float
    unit: str
    reason: str
    ref_type: Optional[str] = None
    ref_id: Optional[str] = None
