"""Google Settings model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone

class GoogleSettings(BaseModel):
    venue_id: str
    enabled: bool = False
    oauth_ref: str = ""  # secret://...
    scopes: List[str] = [
        "business.profile",
        "calendar",
        "drive",
        "analytics.readonly",
        "ads.readonly"
    ]
    enabled_features: dict = {
        "business_profile": True,
        "reviews": True,
        "calendar": True,
        "drive": True,
        "analytics": True,
        "ads": False,
        "forms": False,
        "sheets": False
    }
    connected_at: str = ""
    last_sync_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
