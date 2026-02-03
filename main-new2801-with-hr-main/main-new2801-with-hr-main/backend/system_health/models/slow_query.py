"""Query Performance Monitor"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class SlowQueryLog(BaseModel):
    venue_id: str
    service_name: str
    operation: str
    duration_ms: float
    filters_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
