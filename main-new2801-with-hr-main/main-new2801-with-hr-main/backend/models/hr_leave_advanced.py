"""Advanced Leave Management Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class AccrualMethod(str, Enum):
    MONTHLY = "monthly"
    ANNUAL = "annual"
    PER_HOUR_WORKED = "per_hour_worked"


class LeaveAccrualRule(BaseModel):
    """Leave accrual rule"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    leave_type: str  # annual, sick, personal
    accrual_method: AccrualMethod
    accrual_rate: float  # days per month/year or hours
    max_balance: Optional[float] = None
    carryover_allowed: bool = False
    carryover_max: Optional[float] = None
    carryover_expiry_months: Optional[int] = None
    probation_period_months: int = 0
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BlackoutDate(BaseModel):
    """Blackout dates - no leave allowed"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    name: str
    start_date: str
    end_date: str
    reason: str
    applies_to_roles: List[str] = []  # if empty, applies to all
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LeaveBalance(BaseModel):
    """Employee leave balance"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    leave_type: str
    accrued: float
    used: float
    pending: float
    balance: float
    carryover: float = 0
    last_accrual_date: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LeaveRequestAdvanced(BaseModel):
    """Advanced leave request"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str
    employee_name: str
    leave_type: str
    start_date: str
    end_date: str
    days: float
    reason: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected, cancelled
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    blackout_override: bool = False
    balance_checked: bool = False
    balance_at_request: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
