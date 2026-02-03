from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from .common import ReservationStatus
import uuid

class GuestCreate(BaseModel):
    venue_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: List[str] = []
    preferences: Optional[str] = None
    allergens: List[str] = []

class Guest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: List[str] = []
    preferences: Optional[str] = None
    allergens: List[str] = []
    visit_count: int = 0
    total_spend: float = 0.0
    last_visit: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReservationCreate(BaseModel):
    venue_id: str
    guest_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    party_size: int
    table_id: Optional[str] = None
    special_requests: Optional[str] = None
    source: str = "phone"  # phone, online, walk-in

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    guest_id: str
    guest_name: str
    date: str
    time: str
    party_size: int
    table_id: Optional[str] = None
    status: ReservationStatus = ReservationStatus.PENDING
    special_requests: Optional[str] = None
    source: str = "phone"
    seated_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
