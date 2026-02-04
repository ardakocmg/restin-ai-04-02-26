"""Playbook model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone

class PlaybookStep(BaseModel):
    type: str  # CHECK | NAVIGATE | RUN
    label: str
    target: dict = {}  # {"page_key": "...", "endpoint": "..."}
    safe: bool = True

class Playbook(BaseModel):
    id: str
    venue_id: str
    key: str  # e.g., "OUTBOX_LAG_CRIT"
    title: str
    severity: str = "WARN"
    triggers: List[dict] = []
    steps: List[PlaybookStep] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
