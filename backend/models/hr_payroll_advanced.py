"""Advanced Payroll Processing Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class PayrollRunState(str, Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    APPROVED = "approved"
    LOCKED = "locked"
    DISPATCHED = "dispatched"
    FAILED = "failed"


class PayComponent(BaseModel):
    """Pay component"""
    component_name: str
    component_type: str  # earning, deduction, tax
    amount: float
    is_taxable: bool = True


class PayslipData(BaseModel):
    """Payslip data for employee"""
    employee_id: str
    employee_name: str
    employee_number: str
    period_start: str
    period_end: str
    basic_pay: float
    components: List[PayComponent]
    gross_pay: float
    total_deductions: float
    net_pay: float
    tax_amount: float
    hours_worked: Optional[float] = None
    overtime_hours: Optional[float] = None


class PayrollRun(BaseModel):
    """Payroll run"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    run_number: str
    run_name: str
    period_start: str
    period_end: str
    state: PayrollRunState = PayrollRunState.DRAFT
    payslips: List[PayslipData]
    total_gross: float
    total_net: float
    total_tax: float
    employee_count: int
    validated_by: Optional[str] = None
    validated_at: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    locked_by: Optional[str] = None
    locked_at: Optional[str] = None
    dispatched_at: Optional[str] = None
    dispatch_method: Optional[str] = None  # email, bank_transfer
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PayrollRunRequest(BaseModel):
    """Request to create payroll run"""
    run_name: str
    period_start: str
    period_end: str
    payslips: List[Dict[str, Any]]


class DispatchQueue(BaseModel):
    """Payslip dispatch queue"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payroll_run_id: str
    employee_id: str
    payslip_id: str
    method: str  # email, portal
    status: str = "pending"  # pending, sent, failed
    email: Optional[str] = None
    sent_at: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
