"""Incident model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class Incident(BaseModel):
    incident_id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    title: str
    severity: str = "MED"  # LOW | MED | HIGH | CRIT
    status: str = "OPEN"  # OPEN | MITIGATING | RESOLVED
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: str = ""
    owner_identity_id: str = ""
    related_finding_ids: List[str] = []
    related_timeline_id: str = ""
    notes: List[dict] = []
