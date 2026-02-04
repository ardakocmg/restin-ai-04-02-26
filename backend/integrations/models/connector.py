"""Connector model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class Connector(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    connector_key: str  # telegram | whatsapp | email | google_reserve | tripadvisor | generic
    name: str
    enabled: bool = False
    config: dict = {}  # Non-secret config
    secrets_ref: dict = {}  # {"bot_token": "secret://..."}
    capabilities: List[str] = []  # ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"]
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
