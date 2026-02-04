from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from models.payroll import PayrollRun, Payslip, PayrollItem, PayrollRunCreate
from core.dependencies import get_current_user, get_database
from mock_data_store import MOCK_EMPLOYEES
import uuid
from datetime import datetime

router = APIRouter(prefix="/hr/payroll", tags=["Payroll"])

def calculate_tax(gross: float, profile: str) -> float:
    # Simplified Malta Tax Bands 2024 (Mock Logic)
    # Single Rates
    if profile == "Single":
        if gross <= 9100: return 0
        if gross <= 14500: return (gross - 9100) * 0.15
        if gross <= 19500: return (5400 * 0.15) + (gross - 14500) * 0.25
        if gross <= 60000: return (5400 * 0.15) + (5000 * 0.25) + (gross - 19500) * 0.25
        return (gross) * 0.35 # Simplified top rate
    return gross * 0.10 # Default fallback

def calculate_ssc(gross: float) -> float:
    # Simplified 10% capped
    ssc = gross * 0.10
    if ssc > 50: ssc = 50.0 # Weekly cap approx
    return ssc

@router.get("/runs", response_model=List[PayrollRun])
async def get_payroll_runs(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all payroll runs"""
    runs = await db["payroll_runs"].find().to_list(1000)
    return runs

@router.get("/runs/{run_id}", response_model=PayrollRun)
async def get_payroll_run_detail(
    run_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get details of a specific payroll run"""
    run = await db["payroll_runs"].find_one({"id": run_id})
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return run

@router.post("/calculate", response_model=PayrollRun)
async def create_payroll_run(
    request: PayrollRunCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Calculate and create a new payroll run"""
    
    payslips = []
    total_gross = 0
    total_net = 0
    total_tax = 0
    
    from mock_data_store import MOCK_CLOCKING, MOCK_EMPLOYEES
    
    for emp_code, emp_data in MOCK_EMPLOYEES.items():
        if request.employees and emp_code not in request.employees:
            continue
            
        # Sum hours and cost from clocking records for this employee
        emp_clockings = [c for c in MOCK_CLOCKING if c["employee_code"] == emp_code]
        total_hours = sum(c["hours_worked"] for c in emp_clockings)
        basic_pay = sum(c["total_cost"] for c in emp_clockings)
        
        # Add some mock bonus/overtime if they worked a lot
        overtime = 100.0 if total_hours > 40 else 0.0
        gross = basic_pay + overtime
        
        tax = calculate_tax(gross, "Single")
        ssc = calculate_ssc(gross)
        net = gross - tax - ssc
        
        items = [
            PayrollItem(item_code="ABS", description=f"Basic Pay ({total_hours} hrs)", amount=basic_pay, type="EARNING"),
            PayrollItem(item_code="OVT", description="Performance Bonus", amount=overtime, type="EARNING"),
            PayrollItem(item_code="TAX", description="FSS Tax", amount=tax, type="TAX"),
            PayrollItem(item_code="SSC", description="Social Security", amount=ssc, type="SSC")
        ]
        
        payslip = Payslip(
            employee_code=emp_code,
            employee_name=emp_data['full_name'],
            employee_role=emp_data['occupation'],
            basic_pay=basic_pay,
            overtime_pay=overtime,
            gross_pay=gross,
            tax_deducted=tax,
            ssc_contribution=ssc,
            net_pay=net,
            items=items
        )
        payslips.append(payslip)
        
        total_gross += gross
        total_net += net
        total_tax += tax

    new_run = PayrollRun(
        id=str(uuid.uuid4())[:8],
        run_name=request.run_name,
        period_start=request.period_start,
        period_end=request.period_end,
        state="DRAFT",
        employee_count=len(payslips),
        total_gross=round(total_gross, 2),
        total_net=round(total_net, 2),
        total_tax=round(total_tax, 2),
        created_at=datetime.now().strftime("%d/%m/%Y"),
        payslips=payslips
    )
    
    await db["payroll_runs"].insert_one(new_run.dict())
    return new_run

@router.delete("/runs/{run_id}")
async def delete_payroll_run(
    run_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete a specific payroll run"""
    result = await db["payroll_runs"].delete_one({"id": run_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    return {"status": "success", "message": "Payroll run deleted"}
