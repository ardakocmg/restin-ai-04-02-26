"""Cash Shift model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class CashShift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    drawer_id: str
    shift_date: str
    status: str = "OPEN"  # OPEN | CLOSED
    opening_float: float = 0.0
    expected_cash: float = 0.0
    counted_cash: float = 0.0
    variance: float = 0.0
    variance_reason: str = ""
    opened_by: str
    closed_by: str = ""
    opened_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    closed_at: str = ""
