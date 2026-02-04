"""Supplier model"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4


class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""  # SUP-XXXXX
    venue_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms_days: Optional[int] = 30
    delivery_days: List[str] = []  # ["Monday", "Wednesday", "Friday"]
    lead_time_days: Optional[int] = 3
    is_active: bool = True
    archived_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SupplierCreate(BaseModel):
    venue_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms_days: Optional[int] = 30
    delivery_days: List[str] = []
    lead_time_days: Optional[int] = 3
