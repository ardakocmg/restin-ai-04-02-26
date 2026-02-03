from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid

class StockCountLine(BaseModel):
    item_id: str
    item_name: str
    counted_qty: float
    unit: str
    theoretical_qty: float = 0.0
    variance: float = 0.0

class StockCount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: str
    venue_id: str
    location_id: str = "default"
    status: str = "DRAFT"  # DRAFT|IN_PROGRESS|COMPLETED
    lines: List[StockCountLine] = []
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WasteEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    item_id: str
    item_name: str
    qty: float
    unit: str
    reason: str  # SPOILAGE|PREP_WASTE|BREAKAGE|OTHER
    cost: float = 0.0
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
