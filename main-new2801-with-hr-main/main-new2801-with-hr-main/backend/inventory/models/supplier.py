from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    payment_terms: str = "NET30"
    lead_time_days: int = 7
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str

class SupplierCreate(BaseModel):
    venue_id: str
    name: str
    code: Optional[str] = None
