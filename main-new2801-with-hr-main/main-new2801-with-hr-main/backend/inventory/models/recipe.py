from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class RecipeComponent(BaseModel):
    item_id: str
    item_name: str
    qty: float
    unit: str

class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    menu_item_id: str
    menu_item_name: str
    components: List[RecipeComponent] = []
    yield_qty: float = 1.0
    yield_unit: str = "portion"
    cost: float = 0.0
    cost_currency: str = "EUR"
    last_costed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str

class RecipeCreate(BaseModel):
    venue_id: str
    menu_item_id: str
    components: List[RecipeComponent]
    yield_qty: float = 1.0
