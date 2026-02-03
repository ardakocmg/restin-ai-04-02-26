"""Data Volume Monitor"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class DataVolumeSnapshot(BaseModel):
    venue_id: str
    collection: str
    doc_count: int
    storage_mb: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
