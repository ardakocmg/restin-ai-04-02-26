from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class MenuCreate(BaseModel):
    venue_id: str
    name: str
    is_active: bool = True

class Menu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MenuCategoryCreate(BaseModel):
    venue_id: str
    menu_id: Optional[str] = None
    name: str
    sort_order: int = 0
    prep_area: str = "kitchen"

class MenuCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    menu_id: Optional[str] = None
    name: str
    sort_order: int = 0
    prep_area: str = "kitchen"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MenuItemCreate(BaseModel):
    venue_id: str
    category_id: str
    menu_id: Optional[str] = None
    name: str
    price: float
    price_cents: Optional[int] = None
    description: Optional[str] = None
    allergens: List[str] = []
    tags: List[str] = []
    prep_area: str = "kitchen"
    prep_time_minutes: int = 10

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None  # MI-00001
    venue_id: str
    category_id: str
    menu_id: Optional[str] = None
    name: str
    price: float
    price_cents: Optional[int] = None
    description: Optional[str] = None
    allergens: List[str] = []
    tags: List[str] = []
    prep_area: str = "kitchen"
    prep_time_minutes: int = 10
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ModifierGroupCreate(BaseModel):
    venue_id: str
    name: str  # Size, Doneness, Toppings, Extras
    selection_type: str = "single"  # single or multiple
    required: bool = False
    sort_order: int = 0

class ModifierGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    selection_type: str = "single"
    required: bool = False
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ModifierOptionCreate(BaseModel):
    group_id: str
    name: str
    price_adjustment: float = 0.0  # Can be positive or negative
    is_default: bool = False
    sort_order: int = 0

class ModifierOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    name: str
    price_adjustment: float = 0.0
    is_default: bool = False
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MenuItemModifier(BaseModel):
    """Link between menu items and modifier groups"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    menu_item_id: str
    modifier_group_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
