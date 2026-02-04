"""PTT Productization models"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class PTTRoomExtended(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    priority: str = "NORMAL"  # LOW | NORMAL | HIGH
    busy_mode: str = "SOFT"  # SOFT | HARD
    allow_whisper: bool = True
    allow_talk_requests: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PTTTalkRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    room_id: str
    requester_identity_id: str
    status: str = "PENDING"  # PENDING | APPROVED | DENIED | EXPIRED
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PTTWhisperSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    from_identity_id: str
    to_identity_id: str
    status: str = "ACTIVE"  # ACTIVE | ENDED
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ended_at: str = ""
