"""CRM models"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4

class GuestProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""
    venue_id: str
    name_redacted: str
    pii_encrypted: Optional[str] = None
    tags: List[str] = []
    consent_flags: dict = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GuestAllergy(BaseModel):
    guest_id: str
    allergen: str
    severity: str
    verified_at: str
    source: str
