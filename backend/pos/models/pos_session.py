from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class MenuSnapshot(BaseModel):
    snapshot_id: str
    version: str
    created_at: str
    checksum: str

class PosSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: str
    venue_id: str
    device_id: str
    user_id: str
    menu_snapshot: MenuSnapshot
    opened_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    closed_at: Optional[str] = None
    status: str = "OPEN"  # OPEN|CLOSED
    last_seen_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PosSessionCreate(BaseModel):
    venue_id: str
    device_id: str
    user_id: str
