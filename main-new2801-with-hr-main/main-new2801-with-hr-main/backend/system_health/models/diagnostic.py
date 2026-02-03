"""Diagnostic Report model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone

class DiagnosticReport(BaseModel):
    report_id: str
    venue_id: str
    overall_status: str  # OK | WARN | CRIT
    failed_checks: List[dict] = []
    suggested_actions: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
