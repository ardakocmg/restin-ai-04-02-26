"""Google Calendar Event model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class GoogleCalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    external_event_id: str  # Google Calendar event ID
    calendar_id: str
    title: str
    description: str = ""
    start_time: str
    end_time: str
    event_type: str = "OTHER"  # BUYOUT | CLOSURE | PRIVATE_EVENT | OTHER
    linked_task_id: str = ""
    synced_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
