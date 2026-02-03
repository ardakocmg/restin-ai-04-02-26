from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from .common import UserRole, StationType
import uuid

class UserCreate(BaseModel):
    venue_id: str
    name: str
    pin: str
    role: UserRole
    email: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    pin_hash: str
    role: UserRole
    email: Optional[str] = None
    mfa_secret: Optional[str] = None
    mfa_enabled: bool = False
    last_login: Optional[str] = None
    device_id: Optional[str] = None
    # Multi-venue access
    allowed_venue_ids: List[str] = Field(default_factory=list)
    default_venue_id: Optional[str] = None
    
    # Archiving & Status
    is_archived: bool = False
    archived_at: Optional[str] = None
    status: str = 'active'  # active, archived, suspended
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShiftCreate(BaseModel):
    venue_id: str
    user_id: str
    start_time: str  # ISO format datetime
    end_time: str    # ISO format datetime
    station_type: Optional[StationType] = None

class Shift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    user_id: str
    start_time: str
    end_time: str
    station_type: Optional[StationType] = None
    checked_in: bool = False
    checked_in_at: Optional[str] = None
    checked_out: bool = False
    checked_out_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ManagerOverride(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    user_id: str  # Staff member
    manager_id: str  # Manager who granted override
    reason: str
    granted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str  # ISO format datetime
