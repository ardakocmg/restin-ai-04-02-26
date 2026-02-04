from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class TaxStatus(str, Enum):
    SINGLE = "Single"
    MARRIED = "Married"
    PARENT = "Parent"

class SSC_Category(str, Enum):
    A = "A" # Basic Employee
    B = "B" # Basic Employee (Option)
    C = "C" # Students
    D = "D" # Students (Option)
    # Add full list as needed

class MaltaTaxProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    tax_status: TaxStatus
    ssc_category: SSC_Category
    has_main_employment: bool = True
    student_status: bool = False
    
class PayrollRunMT(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    period_start: datetime
    period_end: datetime
    pay_date: datetime
    
    # Totals for FS5
    total_gross: float = 0.0
    total_tax: float = 0.0
    total_ssc_employee: float = 0.0
    total_ssc_employer: float = 0.0
    total_maternity_fund: float = 0.0
    
    status: str = "DRAFT" # DRAFT, APPROVED, PROCESSED

class FS3_Entry(BaseModel):
    """Annual Statement of Earnings (per employee)"""
    employee_id: str
    year: int
    gross_emoluments: float
    tax_deducted: float
    ssc_employee: float
    maternity_fund: float

class FS5_Form(BaseModel):
    """Monthly FSS/SSC Return"""
    venue_id: str
    month: int
    year: int
    number_of_payees: int
    total_gross_emoluments: float
    total_tax_deducted: float
    total_ssc_contributions: float
    total_maternity_fund: float
    date_submitted: Optional[datetime] = None

class FS7_Form(BaseModel):
    """Annual Reconciliation Statement"""
    venue_id: str
    year: int
    total_gross_emoluments: float
    total_tax_deducted: float
    total_ssc_contributions: float
    total_maternity_fund: float
    total_fs5_payments: float
    balance_due: float
