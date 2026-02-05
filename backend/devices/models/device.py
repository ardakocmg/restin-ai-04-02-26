from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class DeviceType(str, Enum):
    POS = "POS"
    KDS_HUB = "KDS_HUB"
    KDS_SCREEN = "KDS_SCREEN"

class Device(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    type: DeviceType
    name: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    model: Optional[str] = "Unknown Device"
    os: Optional[str] = "Unknown OS"
    browser: Optional[str] = "Unknown Browser"
    screen_resolution: Optional[str] = None
    user_agent_hash: Optional[str] = None
    last_seen_at: Optional[str] = None
    trusted: bool = False
    tags: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: Optional[str] = None

class DeviceCreate(BaseModel):
    venue_id: str
    type: DeviceType
    name: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    model: Optional[str] = "Unknown Device"
    os: Optional[str] = "Unknown OS"
    browser: Optional[str] = "Unknown Browser"
    screen_resolution: Optional[str] = None
    tags: List[str] = []

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    trusted: Optional[bool] = None
    tags: Optional[List[str]] = None
