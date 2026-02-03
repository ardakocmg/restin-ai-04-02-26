from fastapi import APIRouter, Depends, HTTPException
from core.dependencies import get_current_user, get_database
from models.payroll import PayrollRun
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter(prefix="/hr/payroll/reports", tags=["Government Reporting"])

# Models
class FS5Data(BaseModel):
    month: str
    year: str
    number_of_payees: int
    total_gross_emoluments: float
    total_fss_tax: float
    total_ssc_employee: float
    total_ssc_employer: float
    total_maternity_fund: float
    total_payment_due: float

class FS3Data(BaseModel):
    year: str
    employee_code: str
    employee_name: str
    id_card: str
    gross_emoluments: float
    fss_tax_deducted: float
    ssc_employee: float
    maternity_fund: float = 0
    fringe_benefits: float = 0

class FS7Data(BaseModel):
    year: str
    total_sheets_attached: int
    total_gross_emoluments: float
    total_fss_tax: float
    total_ssc: float
    total_maternity_fund: float
    total_due: float

# Logic
@router.get("/fs5/{run_id}", response_model=FS5Data)
async def get_fs5_report(
    run_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Generate FS5 Monthly Return data for a specific payroll run"""
    run_data = await db["payroll_runs"].find_one({"id": run_id})
    if not run_data:
        raise HTTPException(404, "Payroll run not found")
    
    run = PayrollRun(**run_data)
        
    ssc_employee = sum(p.ssc_contribution for p in run.payslips)
    ssc_employer = ssc_employee * 1.0 # Mock: Employer pays same as employee roughly
    maternity_fund = run.total_gross * 0.003 # 0.3% Maternity Fund
    
    return FS5Data(
        month=run.period_end.split('/')[1], # Extract month
        year=run.period_end.split('/')[2],  # Extract year
        number_of_payees=run.employee_count,
        total_gross_emoluments=run.total_gross,
        total_fss_tax=run.total_tax,
        total_ssc_employee=ssc_employee,
        total_ssc_employer=ssc_employer,
        total_maternity_fund=maternity_fund,
        total_payment_due=run.total_tax + ssc_employee + ssc_employer + maternity_fund
    )

@router.get("/fs3/{year}", response_model=List[FS3Data])
async def get_fs3_annual(
    year: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Generate Annual FS3 data for all employees"""
    # Filter runs for the year
    # Using regex search on period_end string for simplicity in this migration
    cursor = db["payroll_runs"].find({"period_end": {"$regex": f"{year}$"}})
    runs_data = await cursor.to_list(1000)
    
    year_runs = [PayrollRun(**r) for r in runs_data]
    
    employee_totals: Dict[str, FS3Data] = {}
    
    for run in year_runs:
        for slip in run.payslips:
            code = slip.employee_code
            if code not in employee_totals:
                employee_totals[code] = FS3Data(
                    year=year,
                    employee_code=code,
                    employee_name=slip.employee_name,
                    id_card="123456M", # Mock ID
                    gross_emoluments=0,
                    fss_tax_deducted=0,
                    ssc_employee=0
                )
            
            data = employee_totals[code]
            data.gross_emoluments += slip.gross_pay
            data.fss_tax_deducted += slip.tax_deducted
            data.ssc_employee += slip.ssc_contribution
            
    return list(employee_totals.values())

@router.get("/fs7/{year}", response_model=FS7Data)
async def get_fs7_annual(
    year: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Generate FS7 Annual Reconciliation Statement"""
    # Re-use the logic from get_fs3_annual to avoid code duplication issues with DB dep
    # (Or just call it directly if we refactor, but for now we follow the same pattern)
    
    cursor = db["payroll_runs"].find({"period_end": {"$regex": f"{year}$"}})
    runs_data = await cursor.to_list(1000)
    
    year_runs = [PayrollRun(**r) for r in runs_data]
    
    total_gross = 0
    total_tax = 0
    total_ssc_emp = 0
    total_sheets = 0
    
    # Calculate aggregation manually from runs + payslips
    # Ideally should use FS3 aggregation but we need to fetch all employees first
    
    processed_employees = set()
    
    for run in year_runs:
        for slip in run.payslips:
            total_gross += slip.gross_pay
            total_tax += slip.tax_deducted
            total_ssc_emp += slip.ssc_contribution
            processed_employees.add(slip.employee_code)
            
    total_ssc = total_ssc_emp * 2 # Emp + Employer
    total_maternity = total_gross * 0.003
    
    return FS7Data(
        year=year,
        total_sheets_attached=len(processed_employees),
        total_gross_emoluments=total_gross,
        total_fss_tax=total_tax,
        total_ssc=total_ssc,
        total_maternity_fund=total_maternity,
        total_due=total_tax + total_ssc + total_maternity
    )
