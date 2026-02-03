"""System Health model"""
from pydantic import BaseModel
from datetime import datetime, timezone

class HealthSnapshot(BaseModel):
    venue_id: str
    overall: str  # OK | DEGRADED | DOWN
    hard: dict  # {"db": "OK", "auth": "OK", ...}
    soft: dict  # {"outbox_lag": {"value": 12, "status": "OK"}, ...}
    last_updated_at: str = datetime.now(timezone.utc).isoformat()
