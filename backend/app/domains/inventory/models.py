from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Supplier(BaseModel):
    id: str
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class InventoryItem(BaseModel):
    id: str
    venue_id: str = Field(alias="venueId")
    name: str
    category: str
    stock: float
    unit: str
    price_cents: int = Field(alias="priceCents")
    min_stock: int = Field(alias="minStock")
    supplier_id: Optional[str] = None
    par_level: Optional[float] = None
    reorder_point: Optional[float] = None
    last_restock_date: Optional[datetime] = None

class StockAdjustment(BaseModel):
    item_id: str
    quantity_change: float
    reason: str
    user_id: str
