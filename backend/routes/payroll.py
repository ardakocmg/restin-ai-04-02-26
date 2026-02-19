from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List
from models.payroll import PayrollRun, Payslip, PayrollItem, PayrollRunCreate
from core.dependencies import get_current_user, get_database
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
    """Calculate and create a new payroll run from real DB data"""

    payslips = []
    total_gross = 0
    total_net = 0
    total_tax = 0

    # Fetch real employees from DB
    emp_query = {"employment_status": {"$ne": "terminated"}}
    employees = await db["employees"].find(emp_query).to_list(500)

    for emp in employees:
        emp_id = emp.get("id") or str(emp.get("_id"))
        emp_code = emp.get("display_id", emp_id)

        if request.employees and emp_code not in request.employees:
            continue

        # Sum hours from real clocking_records for this employee
        clock_query = {"employee_id": emp_id}
        clockings = await db["clocking_records"].find(clock_query).to_list(5000)
        total_hours = sum(c.get("hours_worked", 0.0) for c in clockings)

        # Use payroll profile hourly rate if available, else default
        profile = await db["payroll_profiles"].find_one({"employee_id": emp_id})
        hourly_rate = profile.get("hourly_rate", 12.0) if profile else 12.0
        basic_pay = round(total_hours * hourly_rate, 2)

        # Overtime bonus
        overtime = 100.0 if total_hours > 40 else 0.0
        gross = basic_pay + overtime

        tax = calculate_tax(gross, "Single")
        ssc = calculate_ssc(gross)
        net = gross - tax - ssc

        items = [
            PayrollItem(item_code="ABS", description=f"Basic Pay ({total_hours:.1f} hrs)", amount=basic_pay, type="EARNING"),
            PayrollItem(item_code="OVT", description="Performance Bonus", amount=overtime, type="EARNING"),
            PayrollItem(item_code="TAX", description="FSS Tax", amount=tax, type="TAX"),
            PayrollItem(item_code="SSC", description="Social Security", amount=ssc, type="SSC")
        ]

        payslip = Payslip(
            employee_code=emp_code,
            employee_name=emp.get("full_name", emp.get("name", "Unknown")),
            employee_role=emp.get("occupation", emp.get("role", "Staff")),
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
