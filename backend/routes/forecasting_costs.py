"""Forecasting Costs Routes"""
from fastapi import APIRouter, Depends
from models.forecasting_costs import ForecastingCostMetrics
from core.dependencies import get_current_user, get_database

router = APIRouter(prefix="/forecasting-costs", tags=["Forecasting Costs"])


@router.get("/metrics", response_model=ForecastingCostMetrics)
async def get_forecasting_cost_metrics(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get forecasting cost metrics"""
    return ForecastingCostMetrics(
        projected_costs_next_quarter=350000.00,
        projected_headcount_next_quarter=105,
        cost_variance=5.5,  # +5.5% vs last quarter
        by_department=[
            {"name": "Front of House", "projected_cost": 155000.00},
            {"name": "Kitchen", "projected_cost": 140000.00},
            {"name": "Admin", "projected_cost": 55000.00}
        ],
        trend_forecast=[
            {"month": "May", "cost": 115000.00},
            {"month": "Jun", "cost": 117000.00},
            {"month": "Jul", "cost": 118000.00},
            {"month": "Aug", "cost": 120000.00},
            {"month": "Sep", "cost": 122000.00},
            {"month": "Oct", "cost": 123000.00}
        ]
    )
