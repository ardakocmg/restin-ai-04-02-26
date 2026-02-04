from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import random
import uuid

class DevicePairingCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    code_4_digit: str
    expires_at: str
    used_by_device_id: Optional[str] = None
    used_at: Optional[str] = None
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @staticmethod
    def generate_code() -> str:
        return f"{random.randint(1000, 9999)}"

    @staticmethod
    def generate_expiry(minutes: int = 15) -> str:
        return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()

class PairingCodeCreate(BaseModel):
    venue_id: str
