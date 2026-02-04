"""Job model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class JobDefinition(BaseModel):
    job_key: str
    name: str
    schedule: dict = {}  # {"type": "RRULE", "rrule": "..."}
    enabled: bool = True
    expected_heartbeat_seconds: int = 120
    owner_module: str = "system"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class JobHeartbeat(BaseModel):
    job_key: str
    venue_id: str
    last_heartbeat_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_run_at: str = ""
    last_success_at: str = ""
    last_error: str = ""
    status: str = "OK"  # OK | WARN | CRIT | STOPPED
