from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class PriceBook(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    priority: int = 0  # Higher priority = checked first
    active: bool = True
    channels: List[str] = []  # ["DINE_IN", "TAKEOUT", "DELIVERY"]
    order_types: List[str] = []  # ["REGULAR", "HAPPY_HOUR"]
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None

class PriceBookCreate(BaseModel):
    venue_id: str
    name: str
    priority: int = 0
    channels: List[str] = []
    order_types: List[str] = []
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None

class PriceBookUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None
    active: Optional[bool] = None
    channels: Optional[List[str]] = None
    order_types: Optional[List[str]] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
