from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TaxStatus(str, Enum):
    SINGLE = 'single'
    MARRIED = 'married'
    PARENT = 'parent'

class EmployeeStatus(str, Enum):
    ACTIVE = 'active'
    TERMINATED = 'terminated'

class Employee(BaseModel):
    id: str
    venue_id: str = Field(alias="venueId")
    first_name: str
    last_name: str
    role: str
    gross_salary_cents: int
    tax_status: TaxStatus
    ss_number: str
    start_date: datetime
    status: EmployeeStatus

class PayslipStatus(str, Enum):
    DRAFT = 'draft'
    APPROVED = 'approved'
    PAID = 'paid'

class Payslip(BaseModel):
    id: str
    employee_id: str
    period_start: datetime
    period_end: datetime
    gross_pay_cents: int
    tax_cents: int
    ssc_cents: int
    net_pay_cents: int
    status: PayslipStatus
    created_at: datetime = Field(default_factory=datetime.utcnow)
