"""Enhanced Inventory Item model"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4

class InventoryItemEnhanced(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # SKU-XXXXX
    venue_id: str
    name: str
    unit: str = "EA"  # Base UOM
    quantity: float = 0.0
    min_quantity: float = 0.0
    pricing_basis: Optional[str] = "EA"  # KG/L/EA/PORTION
    base_uom: Optional[str] = "EA"  # G/ML/EA
    preferred_supplier_id: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    image_url: Optional[str] = None
    min_stock: Optional[float] = None
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
