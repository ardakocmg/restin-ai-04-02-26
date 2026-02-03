"""Pre-Go-Live Self Test model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class PreGoLiveCheck(BaseModel):
    key: str
    status: str  # PASS | FAIL
    details: str = ""
    evidence_refs: List[str] = []

class PreGoLiveRun(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    status: str = "RUNNING"  # RUNNING | PASS | FAIL
    checks: List[PreGoLiveCheck] = []
    started_by: str
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: str = ""
