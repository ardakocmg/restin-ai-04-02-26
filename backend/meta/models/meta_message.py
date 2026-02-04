"""Meta Message/Conversation model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class MetaMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    channel: str  # WHATSAPP | INSTAGRAM | FACEBOOK
    external_message_id: str
    thread_id: str
    from_user: dict = {}  # {"external_id": "...", "name": "..."}
    to: dict = {}
    body_text: str
    media_refs: List[str] = []
    direction: str = "INBOUND"  # INBOUND | OUTBOUND
    status: str = "NEW"  # NEW | ROUTED | REPLIED
    linked_ticket_id: str = ""
    received_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
