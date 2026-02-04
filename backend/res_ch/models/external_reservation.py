"""External Reservation model (channel manager)"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class ExternalReservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    source: str  # GOOGLE | OPENTABLE | THEFORK | QUANDOO | SEVENROOMS
    external_reservation_id: str
    guest_name: str
    guest_phone: str = ""
    guest_email: str = ""
    party_size: int
    date: str
    time: str
    special_requests: str = ""
    status: str = "PENDING"  # PENDING | CONFIRMED | SEATED | CANCELLED
    internal_reservation_id: str = ""
    conflict_id: str = ""
    synced_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
