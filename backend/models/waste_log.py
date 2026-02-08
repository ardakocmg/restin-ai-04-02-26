from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WasteLogCreate(BaseModel):
    venue_id: str
    item_id: Optional[str] = None
    item_name: str
    item_type: str # INGREDIENT or RECIPE
    quantity: float
    unit: str
    reason: str
    notes: Optional[str] = None

class WasteLog(WasteLogCreate):
    id: str
    cost_cents: int
    reported_by: str
    created_at: datetime
