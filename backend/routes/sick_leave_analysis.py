"""Sick Leave Analysis Routes"""
from fastapi import APIRouter, Depends
from models.sick_leave_analysis import SickLeaveMetrics
from core.dependencies import get_current_user, get_database

router = APIRouter(prefix="/sick-leave", tags=["Sick Leave Analysis"])


@router.get("/metrics", response_model=SickLeaveMetrics)
async def get_sick_leave_metrics(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get sick leave metrics"""
    return SickLeaveMetrics(
        total_sick_days=45,
        employees_on_sick_leave=5,
        average_sick_days_per_employee=0.45,
        by_department=[
            {"name": "Front of House", "days": 20},
            {"name": "Kitchen", "days": 15},
            {"name": "Admin", "days": 10}
        ],
        trend_data=[
            {"month": "Jan", "days": 10},
            {"month": "Feb", "days": 12},
            {"month": "Mar", "days": 11},
            {"month": "Apr", "days": 12}
        ],
        top_reasons=[
            {"reason": "Flu", "count": 15},
            {"reason": "Back Pain", "count": 10},
            {"reason": "Other", "count": 20}
        ]
    )
