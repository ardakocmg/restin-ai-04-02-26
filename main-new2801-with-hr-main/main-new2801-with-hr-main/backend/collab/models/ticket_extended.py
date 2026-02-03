"""Extended Ticket model with productization features"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
from uuid import uuid4

class TicketInternalNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    author_identity_id: str
    note: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TicketEscalation(BaseModel):
    level: int
    due_at: str
    action: str  # NOTIFY | REASSIGN | INCIDENT

class TicketExtended(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    queue_key: str = "OPS"  # OPS | IT | FINANCE | MAINTENANCE | SUPPLIERS
    form_key: str = ""
    fields: dict = {}
    title: str
    description: str = ""
    status: str = "NEW"
    priority: str = "MED"
    sla_policy_key: str = "STANDARD"
    escalations: List[TicketEscalation] = []
    internal_notes: List[TicketInternalNote] = []
    macros_applied: List[dict] = []
    assignee_id: str = ""
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TicketQueue(BaseModel):
    venue_id: str
    key: str
    name: str
    default_assignee_role_id: str = ""
    triage_rules: List[dict] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TicketMacro(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    name: str
    actions: List[dict] = []  # [{"type": "SET_STATUS", "value": "TRIAGED"}]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SLAPolicy(BaseModel):
    venue_id: str
    key: str
    rules_by_priority: dict = {"LOW": 72, "MED": 24, "HIGH": 8, "URGENT": 2}
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
