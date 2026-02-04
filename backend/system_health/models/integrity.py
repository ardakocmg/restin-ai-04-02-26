"""Integrity check models"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class IntegrityRun(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: str = ""
    triggered_by: str = "SCHEDULE"  # SCHEDULE | MANUAL | DEPLOY
    triggered_identity_id: str = ""
    status: str = "RUNNING"  # RUNNING | SUCCESS | FAILED | PARTIAL
    runtime_seconds: float = 0.0
    summary: dict = {}  # {"findings_total": 0, "high": 0, "crit": 0}

class IntegrityFinding(BaseModel):
    finding_id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str
    venue_id: str
    check_key: str
    severity: str
    status: str = "OPEN"  # OPEN | ACKED | RESOLVED | IGNORED
    title: str
    details: dict = {}
    evidence_refs: List[str] = []
    first_seen_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_seen_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    acked_by: str = ""
    acked_at: str = ""
    resolved_by: str = ""
    resolved_at: str = ""
