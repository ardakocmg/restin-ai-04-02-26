"""Shift Plan model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class ShiftPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    identity_id: str  # Assigned employee
    shift_date: str
    start_time: str
    end_time: str
    break_minutes: int = 0
    role: str = ""
    status: str = "PLANNED"  # PLANNED | PUBLISHED | CONFIRMED | COMPLETED
    actual_start: str = ""
    actual_end: str = ""
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
