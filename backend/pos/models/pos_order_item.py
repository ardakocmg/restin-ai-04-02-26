from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class ItemModifier(BaseModel):
    group_id: str
    option_id: str
    qty: int = 1
    price_delta: float = 0.0

class ItemPricing(BaseModel):
    unit_price: float
    line_total: float
    tax_code: Optional[str] = None

class PosOrderItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    venue_id: str
    menu_item_id: str
    menu_item_name: str
    qty: int = 1
    seat_no: Optional[int] = None
    course_no: Optional[int] = None
    modifiers: List[ItemModifier] = []
    instructions: Optional[str] = None
    state: str = "HELD"  # HELD|FIRED|SENT|VOIDED
    pricing: ItemPricing
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str
    updated_by: str

class PosOrderItemCreate(BaseModel):
    order_id: str
    venue_id: str
    menu_item_id: str
    qty: int = 1
    seat_no: Optional[int] = None
    course_no: Optional[int] = None
    modifiers: List[ItemModifier] = []
    instructions: Optional[str] = None
