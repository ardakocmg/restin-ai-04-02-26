from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

OrderStatus = Literal['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'LATE']

class OrderItem(BaseModel):
    name: str
    quantity: int
    price_cents: int = Field(alias="priceCents")
    notes: Optional[str] = None

class Order(BaseModel):
    id: str
    venue_id: str = Field(alias="venueId")
    table_id: str = Field(alias="tableId")
    user_id: str = Field(alias="userId")
    status: OrderStatus
    total_cents: int = Field(alias="totalCents")
    items: List[OrderItem]
    created_at: datetime = Field(alias="createdAt")
    updated_at: Optional[datetime] = Field(alias="updatedAt")

class OrderCreate(BaseModel):
    venue_id: str = Field(alias="venueId")
    table_id: str = Field(alias="tableId")
    user_id: str = Field(alias="userId")
    items: List[OrderItem]
