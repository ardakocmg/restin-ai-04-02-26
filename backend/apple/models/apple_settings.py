"""Apple Connector Settings"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class AppleSettings(BaseModel):
    venue_id: str
    enabled: bool = False
    apple_place_ref: str = ""  # Apple Maps place identifier
    enabled_features: dict = {"maps": True, "wallet": False}
    auth_ref: str = ""  # secret ref if needed
    last_sync_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
