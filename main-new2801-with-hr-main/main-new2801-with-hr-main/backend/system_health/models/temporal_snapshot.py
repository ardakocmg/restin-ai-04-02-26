"""Temporal Snapshot model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class TemporalSnapshot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    snapshot_type: str  # KPI | READ_MODEL
    subject_key: str  # e.g., "inventory.stock"
    payload: dict = {}  # Redacted JSON
    captured_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
