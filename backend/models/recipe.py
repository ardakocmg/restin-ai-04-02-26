"""Recipe model with tree structure"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone
from uuid import uuid4

class RecipeComponent(BaseModel):
    type: Literal["SKU", "SUB_RECIPE"]
    ref_id: str  # sku_id or recipe_id
    qty_base: float
    waste_factor: float = 1.0  # 1.0 = no waste
    prep_loss: float = 0.0  # percentage

class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # RCP-XXXXX
    venue_id: str
    sku_id: str  # Output SKU
    version: int = 1
    is_active: bool = False
    components: List[RecipeComponent] = []
    yield_qty: float = 1.0
    yield_uom: str = "EA"
    notes: Optional[str] = None
    created_by: str
    activated_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
