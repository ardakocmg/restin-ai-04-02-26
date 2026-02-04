"""
Observability Models - Test Panel & Error Inbox
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class StepStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    SKIPPED = "SKIPPED"
    PENDING = "PENDING"
    RETRIED = "RETRIED"
    BLOCKED = "BLOCKED"

class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class Domain(str, Enum):
    POS = "POS"
    KDS = "KDS"
    INVENTORY = "INVENTORY"
    RESERVATIONS = "RESERVATIONS"
    HR = "HR"
    DEVICES = "DEVICES"
    REPORTING = "REPORTING"
    SYSTEM = "SYSTEM"

class ErrorInboxStatus(str, Enum):
    OPEN = "OPEN"
    ACKED = "ACKED"
    RESOLVED = "RESOLVED"
    MUTED = "MUTED"

class StepDetail(BaseModel):
    step_id: str
    title: str
    domain: Domain
    status: StepStatus
    severity: Severity = Severity.INFO
    blocking: bool = False
    retryable: bool = False
    error_code: Optional[str] = None
    error_detail: Optional[Dict[str, Any]] = None
    suggested_actions: List[Dict[str, str]] = []
    report_impacts: List[str] = []
    timestamp: str

class RetryPlan(BaseModel):
    allowed: bool
    mode: str  # STEP_RETRY | FULL_REPLAY
    requires_token: bool = True
    action_token_ttl_seconds: int = 60
    idempotency_key_template: str
    target: Dict[str, str]  # method, path
    base_headers: Dict[str, str] = {}
    base_query: Dict[str, Any] = {}
    base_body_redacted: Dict[str, Any] = {}
    editable_fields: List[Dict[str, Any]] = []
    guards: List[Dict[str, Any]] = []

class ErrorInboxItem(BaseModel):
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    display_id: str
    venue_id: str
    created_at: str
    last_seen_at: str
    status: ErrorInboxStatus = ErrorInboxStatus.OPEN
    severity: Severity
    domain: Domain
    signature: Optional[str] = None
    source: Dict[str, Any]
    error: Dict[str, Any]
    entity_refs: Dict[str, Any] = {}
    steps: List[StepDetail] = []
    report_impacts: List[str] = []
    retry_plan: Optional[RetryPlan] = None
    audit_refs: List[str] = []
    event_refs: List[str] = []
    resolution: Optional[Dict[str, Any]] = None
    occurrence_count: int = 1
    retry_attempts: int = 0
    last_retry_at: Optional[str] = None

class TestPanelRun(BaseModel):
    id: str = Field(default_factory=lambda: str(__import__('uuid').uuid4()))
    display_id: str
    venue_id: str
    created_at: str
    created_by: str
    test_type: str  # MANUAL | AUTO | REPLAY
    target: Dict[str, str]  # method, path
    request_body: Dict[str, Any] = {}
    request_query: Dict[str, Any] = {}
    response: Dict[str, Any] = {}
    status_code: int
    trace: Dict[str, Any] = {}
    events: List[Dict[str, Any]] = []
    audits: List[Dict[str, Any]] = []
    steps: List[StepDetail] = []
    diagrams: Dict[str, str] = {}  # mermaid_sequence, mermaid_state
    report_impacts: List[str] = []
    success: bool = True
