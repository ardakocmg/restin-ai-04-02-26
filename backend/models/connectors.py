"""API Connectors models"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class Connector(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    type: str
    status: str = "INACTIVE"
    auth: dict = {}
    endpoints: dict = {}
    mappings: dict = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
