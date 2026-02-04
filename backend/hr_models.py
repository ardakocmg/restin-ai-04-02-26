"""
HR vNext Complete Models
All HR, Payroll, Tips, Contracts, Timesheets models
Server-authoritative, Malta-ready
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

# ==================== CONTRACTS ====================
class ContractType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CASUAL = "casual"
    CONTRACTOR = "contractor"

class BasePayType(str, Enum):
    MONTHLY = "monthly"
    HOURLY = "hourly"

class PayFrequency(str, Enum):
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"

class ContractStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ENDED = "ended"

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    employee_id: str
    contract_type: ContractType
    start_date: str
    end_date: Optional[str] = None
    base_pay_type: BasePayType
    base_rate: float
    pay_frequency: PayFrequency
    standard_hours_per_week: float = 40.0
    probation_end: Optional[str] = None
    allowances: List[Dict[str, Any]] = []
    deductions: List[Dict[str, Any]] = []
    status: ContractStatus = ContractStatus.DRAFT
    signed_at: Optional[str] = None
    signed_by: Optional[str] = None
    attachments: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== TIMESHEETS ====================
class TimesheetStatus(str, Enum):
    OPEN = "open"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    LOCKED = "locked"

class Timesheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    employee_id: str
    period_start: str
    period_end: str
    entries: List[Dict[str, Any]] = []  # [{date, start, end, break_minutes, job_role, notes}]
    total_hours: float = 0.0
    status: TimesheetStatus = TimesheetStatus.OPEN
    submitted_at: Optional[str] = None
    submitted_by: Optional[str] = None
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    rejected_at: Optional[str] = None
    rejected_by: Optional[str] = None
    lock_reason: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== TIPS ====================
class TipsPoolStatus(str, Enum):
    OPEN = "open"
    ALLOCATED = "allocated"
    LOCKED = "locked"

class TipsPool(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    date: str
    shift_id: Optional[str] = None
    sources: List[Dict[str, Any]] = []  # [{type: cash|card|service_charge, amount}]
    total_amount: float = 0.0
    status: TipsPoolStatus = TipsPoolStatus.OPEN
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TipsAllocation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    tips_pool_id: str
    method: str  # points, hours, role_weight
    allocations: List[Dict[str, Any]] = []  # [{employee_id, amount, basis_meta}]
    total_allocated: float = 0.0
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    locked_by: Optional[str] = None
    locked_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== PAYROLL ====================
class PayRunStatus(str, Enum):
    DRAFT = "draft"
    CALCULATED = "calculated"
    APPROVED = "approved"
    LOCKED = "locked"
    EXPORTED = "exported"

class PayRun(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    period_start: str
    period_end: str
    pay_date: str
    scope: str = "all"  # all, department, selected_employees
    status: PayRunStatus = PayRunStatus.DRAFT
    summary_totals: Dict[str, float] = {}
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    locked_by: Optional[str] = None
    locked_at: Optional[str] = None

class Payslip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    pay_run_id: str
    employee_id: str
    earnings: Dict[str, float] = {}  # {base, overtime, allowances, tips}
    deductions: Dict[str, float] = {}  # {tax, social, other}
    gross: float = 0.0
    net: float = 0.0
    pdf_document_id: Optional[str] = None
    email_status: str = "pending"  # pending, sent, failed
    immutable_after_lock: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== APPROVALS ====================
class ApprovalState(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Approval(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    display_id: Optional[str] = None
    venue_id: str
    resource_type: str  # timesheet, tips_pool, payrun, contract
    resource_id: str
    state: ApprovalState = ApprovalState.PENDING
    requested_by: str
    requested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    comment: Optional[str] = None
    signature: Optional[Dict[str, Any]] = None  # {method, signed_name, signed_at}

# ==================== HR SETTINGS ====================
class HRSettings(BaseModel):
    venue_id: str
    currency: str = "EUR"
    locale: str = "en-MT"
    tax_tables: Dict[str, Any] = {}
    social_security_rules: Dict[str, Any] = {}
    rounding_rules: Dict[str, Any] = {"decimals": 2}
    overtime_rules: Dict[str, Any] = {}
    allowances_catalog: List[Dict[str, str]] = []
    deductions_catalog: List[Dict[str, str]] = []
    payslip_branding: Dict[str, Any] = {}
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None
