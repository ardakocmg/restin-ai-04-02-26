"""Notification/Inbox model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    identity_id: str
    type: str  # MENTION | ASSIGNMENT | TICKET_UPDATE | TASK_UPDATE | PTT_REQUEST | ANNOUNCEMENT
    ref: dict = {}  # {"type": "task", "id": "..."}
    status: str = "UNREAD"  # UNREAD | READ | SNOOZED | DONE
    batch_id: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
