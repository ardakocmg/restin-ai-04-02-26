"""Known Issue model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class KnownIssue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    entity_type: str  # SKU | SUPPLIER | PRINTER | RECIPE | MENU_ITEM | DEVICE
    entity_id: str
    title: str
    description: str
    workaround: str
    severity: str = "INFO"  # INFO | WARN
    expires_at: str = ""
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
