"""ESG Routes"""
from fastapi import APIRouter, Depends
from models.esg import ESGMetrics
from core.dependencies import get_current_user, get_database

router = APIRouter(prefix="/esg", tags=["ESG"])


@router.get("/metrics", response_model=ESGMetrics)
async def get_esg_metrics(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get ESG metrics"""
    return ESGMetrics(
        diversity_score=75.5,
        gender_pay_gap=23.0,  # % pay gap
        employee_satisfaction=4.2,  # out of 5
        training_hours_per_employee=12.5,
        safety_incidents=2,
        carbon_footprint={
            "total_co2": 1250.5,
            "per_employee": 12.38,
            "reduction_target": 15.0
        }
    )
