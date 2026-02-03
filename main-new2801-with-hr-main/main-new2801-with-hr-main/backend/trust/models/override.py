"""Override Request model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class OverrideRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    finding_id: str = ""
    action_key: str
    entity_type: str
    entity_id: str
    requested_by: str
    approved_by: str = ""
    status: str = "REQUESTED"  # REQUESTED | APPROVED | REJECTED | EXPIRED
    reason: str
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
