"""Canonical Inbound Event model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class CanonicalInboundEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    connector_key: str
    source_event_id: str  # Provider's ID (for dedupe)
    type: str  # MESSAGE | RESERVATION | REVIEW | ALERT | SYSTEM
    from_user: dict = {}  # {"external_user_id": "...", "name": "...", "channel": "..."}
    to: dict = {}  # {"external_destination_id": "...", "channel": "..."}
    subject: str = ""
    body_text: str = ""
    payload_redacted: dict = {}  # Sanitized JSON
    received_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    dedupe_hash: str
    status: str = "NEW"  # NEW | PROCESSED | IGNORED
    linked_entities: List[dict] = []  # [{"type": "ticket", "id": "..."}]
