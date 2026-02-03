from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import date

class TaxProfile(BaseModel):
    profile_type: str = Field(..., description="Single, Married, Parent")
    rates: Dict[str, float] = Field(default_factory=dict, description="Tax bands and rates")

class PayrollItem(BaseModel):
    item_code: str
    description: str
    amount: float
    type: str = Field(..., description="EARNING, DEDUCTION, TAX, SSC")

class Payslip(BaseModel):
    employee_code: str
    employee_name: str
    employee_role: str
    basic_pay: float
    overtime_pay: float = 0.0
    bonuses: float = 0.0
    gross_pay: float
    tax_deducted: float
    ssc_contribution: float
    net_pay: float
    items: List[PayrollItem] = []

class PayrollRun(BaseModel):
    id: str
    run_name: str
    period_start: str
    period_end: str
    state: str = Field(..., description="DRAFT, VALIDATED, APPROVED, LOCKED")
    employee_count: int
    total_gross: float
    total_net: float
    total_tax: float
    created_at: str
    payslips: List[Payslip] = []

class PayrollRunCreate(BaseModel):
    run_name: str
    period_start: str
    period_end: str
    employees: List[str] = Field(..., description="List of employee codes")
