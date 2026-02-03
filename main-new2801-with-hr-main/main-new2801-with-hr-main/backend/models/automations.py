"""Automations models"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class Trigger(BaseModel):
    type: str
    condition: str
    source_event: str

class Step(BaseModel):
    type: str  # TEMPLATE | AI_ENRICH | DELAY | WEBHOOK
    payload: dict = {}

class AutomationFlow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    status: str = "INACTIVE"
    triggers: List[Trigger] = []
    steps: List[Step] = []
    channels: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
