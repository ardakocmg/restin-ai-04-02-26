"""Payroll Costs Routes"""
from fastapi import APIRouter, Depends
from models.payroll_costs import PayrollCostMetrics
from core.dependencies import get_current_user, get_database

router = APIRouter(prefix="/payroll-costs", tags=["Payroll Costs"])


@router.get("/metrics", response_model=PayrollCostMetrics)
async def get_payroll_cost_metrics(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get payroll cost metrics"""
    return PayrollCostMetrics(
        total_cost_ytd=450000.00,
        average_cost_per_employee=4455.45,
        by_department=[
            {"name": "Front of House", "cost": 200000.00},
            {"name": "Kitchen", "cost": 180000.00},
            {"name": "Admin", "cost": 70000.00}
        ],
        by_cost_centre=[
            {"name": "DON FOH", "cost": 150000.00},
            {"name": "C&B FOH", "cost": 130000.00},
            {"name": "KTCH", "cost": 170000.00}
        ],
        trend_data=[
            {"month": "Jan", "cost": 110000.00},
            {"month": "Feb", "cost": 112000.00},
            {"month": "Mar", "cost": 115000.00},
            {"month": "Apr", "cost": 113000.00}
        ],
        overtime_costs=25000.00,
        benefits_costs=35000.00
    )
