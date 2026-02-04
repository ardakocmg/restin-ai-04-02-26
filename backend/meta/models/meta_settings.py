"""Meta Connector Settings"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone

class MetaSettings(BaseModel):
    venue_id: str
    enabled: bool = False
    app_id: str = ""
    page_id: str = ""
    ig_id: str = ""
    wa_phone_number_id: str = ""
    enabled_features: dict = {
        "whatsapp": True,
        "instagram": True,
        "facebook": True,
        "ads": True
    }
    webhook_verify_token_ref: str = ""  # secret ref
    access_token_ref: str = ""  # secret ref
    last_sync_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
