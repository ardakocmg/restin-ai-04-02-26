"""Canonical Outbound Event model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class CanonicalOutboundEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    connector_key: str
    type: str  # MESSAGE | EMAIL | NOTIFICATION
    to: dict = {}  # {"external_destination_id": "...", "channel": "..."}
    body_text: str
    payload: dict = {}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "QUEUED"  # QUEUED | SENT | FAILED | DLQ
    delivery_attempts: List[dict] = []
    idempotency_key: str
