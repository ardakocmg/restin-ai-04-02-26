"""Stock Adjustment model"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4

class AdjustmentLine(BaseModel):
    sku_id: str
    qty_delta_base: float
    base_uom: str
    lot_no: Optional[str] = None
    location: Optional[str] = None
    expiry_at: Optional[str] = None

class StockAdjustment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # ADJ-XXXXX
    venue_id: str
    status: str = "DRAFT"  # DRAFT | SUBMITTED | APPROVED | LOCKED | CANCELLED
    reason_code: str  # COUNT | SPOILAGE | THEFT | BREAKAGE | TRANSFER | CORRECTION
    notes: Optional[str] = None
    lines: List[AdjustmentLine] = []
    created_by: str
    approved_by: Optional[str] = None
    locked_by: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    idempotency_key: Optional[str] = None
