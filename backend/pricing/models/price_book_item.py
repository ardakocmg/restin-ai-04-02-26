from pydantic import BaseModel, Field
from typing import Optional
import uuid

class PriceBookItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    price_book_id: str
    item_id: str  # menu_item_id
    price: float
    currency: str = "EUR"

class PriceBookItemCreate(BaseModel):
    price_book_id: str
    item_id: str
    price: float
    currency: str = "EUR"
