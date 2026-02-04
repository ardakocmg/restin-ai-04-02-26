"""Service Day Close model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class ServiceDayCloseCheck(BaseModel):
    key: str
    label: str
    status: str  # OK | WARN | BLOCK
    details: str = ""

class ServiceDayCloseRun(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    service_date: str  # YYYY-MM-DD
    status: str = "READY"  # READY | BLOCKED | CLOSED
    checks: List[ServiceDayCloseCheck] = []
    closed_by: str = ""
    closed_at: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
