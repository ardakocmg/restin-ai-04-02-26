from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    sku: str
    name: str
    category: Optional[str] = None
    base_unit: str = "kg"
    pack_size: Optional[float] = None
    pack_unit: Optional[str] = None
    reorder_level: float = 0.0
    reorder_qty: float = 0.0
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InventoryItemCreate(BaseModel):
    venue_id: str
    sku: str
    name: str
    category: Optional[str] = None
    base_unit: str = "kg"
