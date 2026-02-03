"""Production batch model"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4

class ProductionInput(BaseModel):
    sku_id: str
    qty_used: float

class ProductionOutput(BaseModel):
    sku_id: str
    qty_produced: float

class ProductionBatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # BATCH-XXXXX
    venue_id: str
    inputs: List[ProductionInput] = []
    outputs: List[ProductionOutput] = []
    cost_snapshot: float = 0.0
    produced_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expiry_at: Optional[str] = None
    batch_notes: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
