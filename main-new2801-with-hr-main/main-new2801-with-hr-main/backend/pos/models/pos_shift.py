from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid

class ShiftTotals(BaseModel):
    sales_gross: float = 0.0
    sales_net: float = 0.0
    tax_total: float = 0.0
    cash_total: float = 0.0
    card_total: float = 0.0
    other_total: float = 0.0
    void_total: float = 0.0
    discount_total: float = 0.0

class PosShift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    user_id: str
    device_id: Optional[str] = None
    opened_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    closed_at: Optional[str] = None
    status: str = "OPEN"  # OPEN|CLOSED
    totals: ShiftTotals = ShiftTotals()
    created_by: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PosShiftCreate(BaseModel):
    venue_id: str
    user_id: str
    device_id: Optional[str] = None
