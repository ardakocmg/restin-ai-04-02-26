from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict
import json
import os
from datetime import datetime
from .models import Employee, Payslip
from .services import PayrollService

router = APIRouter(prefix="/api/hr", tags=["HR"])

# Mock Data Loader (Replace with DB Repo later)
def load_mock_employees() -> List[Employee]:
    try:
        # Path relative to backend root or absolute
        path = os.path.join(os.path.dirname(__file__), "../../../../frontend/src/data/seed-master.json")
        with open(path, 'r') as f:
            data = json.load(f)
            return [Employee(**e) for e in data.get("employees", [])]
    except Exception as e:
        print(f"Error loading seeds: {e}")
        return []

@router.get("/employees", response_model=List[Employee])
def get_employees():
    return load_mock_employees()

@router.post("/payroll/calculate", response_model=List[Payslip])
def run_payroll(
    period_start: datetime = Body(..., example="2026-02-01T00:00:00Z"),
    period_end: datetime = Body(..., example="2026-02-28T23:59:59Z"),
    venue_id: str = Body(..., example="venue-caviar-bull")
):
    employees = load_mock_employees()
    venue_employees = [e for e in employees if e.venue_id == venue_id]
    
    if not venue_employees:
        return []
        
    return PayrollService.run_payroll_batch(venue_employees, period_start, period_end)
