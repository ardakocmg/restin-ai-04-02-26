from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class Seat(BaseModel):
    seat_no: int
    label: Optional[str] = None

class Course(BaseModel):
    course_no: int
    label: Optional[str] = None

class OrderTotals(BaseModel):
    subtotal: float = 0.0
    tax: float = 0.0
    service: float = 0.0
    discount: float = 0.0
    grand_total: float = 0.0

class PosOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: str
    venue_id: str
    session_id: str
    table_id: Optional[str] = None
    table_name: Optional[str] = None
    order_type: str = "DINE_IN"  # DINE_IN|TAKEAWAY|DELIVERY
    seats_enabled: bool = False
    course_enabled: bool = False
    seats: List[Seat] = []
    courses: List[Course] = []
    status: str = "OPEN"  # OPEN|SENT|CLOSED|CANCELLED
    totals: OrderTotals = OrderTotals()
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str
    updated_by: str

class PosOrderCreate(BaseModel):
    venue_id: str
    session_id: str
    table_id: Optional[str] = None
    order_type: str = "DINE_IN"
    seats_enabled: bool = False
    course_enabled: bool = False
