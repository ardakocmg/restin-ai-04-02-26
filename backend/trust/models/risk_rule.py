"""Risk Rule model"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class RiskRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    description: str
    enabled: bool = True
    applies_to: List[str] = []  # action_keys
    conditions: dict = {}  # DSL
    outcomes: List[str] = ["LOG_ONLY"]  # ALERT, REQUIRE_SECOND_APPROVAL, BLOCK
    severity: str = "MED"
    schema_version: int = 1
    created_by: str
    updated_by: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RiskFinding(BaseModel):
    finding_id: str = Field(default_factory=lambda: str(uuid4()))
    rule_id: str
    action_key: str
    severity: str
    outcomes: List[str]
    evidence: List[dict] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "OPEN"  # OPEN | ACKED | RESOLVED
