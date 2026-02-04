"""Summary Dashboard Routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models.summary_dashboard import (
    SummaryDashboardData, KPIMetric, HeadcountDataPoint,
    EmploymentTypeData, AgeBracketData, EngagementTerminationData, GenderData
)
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import random

router = APIRouter(prefix="/summary", tags=["Summary Dashboard"])


@router.get("/venues/{venue_id}/summary/dashboard", response_model=SummaryDashboardData)
async def get_summary_dashboard(
    venue_id: str,
    company: str = "All",
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get summary dashboard data"""
    await check_venue_access(current_user, venue_id)
    # But wait, Summary Dashboard is often global or per venue. Let's stick to standard pattern.
    if venue_id != "GLOBAL" and venue_id != "system":
         # Check permissions if strict
         pass

    """Get summary dashboard data"""
    
    from mock_data_store import MOCK_CLOCKING
    total_earnings = sum(clk["total_cost"] for clk in MOCK_CLOCKING)
    
    # Mock data (replace with real queries)
    kpi_metrics = [
        KPIMetric(label="Headcount", value=len(set(clk["employee_code"] for clk in MOCK_CLOCKING)), icon="users"),
        KPIMetric(label="Active Clockings", value=len(MOCK_CLOCKING), icon="clock"),
        KPIMetric(label="Total Forecasted Earnings", value=f"€{total_earnings:,.2f}", icon="wallet")
    ]
    
    headcount_by_year = [
        HeadcountDataPoint(year=2021, count=50),
        HeadcountDataPoint(year=2022, count=70),
        HeadcountDataPoint(year=2023, count=90),
        HeadcountDataPoint(year=2024, count=100),
        HeadcountDataPoint(year=2025, count=101)
    ]
    
    employment_types = [
        EmploymentTypeData(type_name="40 Hour Week", count=28),
        EmploymentTypeData(type_name="40 Hr Wk, 7 Day", count=23),
        EmploymentTypeData(type_name="40 Hour Week (2)", count=21),
        EmploymentTypeData(type_name="40 Hr Wk, 5 Day", count=10)
    ]
    
    age_brackets = [
        AgeBracketData(bracket="Up to 29 years", count=23),
        AgeBracketData(bracket="30-39 years", count=25),
        AgeBracketData(bracket="40-49 years", count=23),
        AgeBracketData(bracket="50-59 years", count=19),
        AgeBracketData(bracket="60-64 years", count=8),
        AgeBracketData(bracket="65+ years", count=3)
    ]
    
    engagements_terminations = [
        EngagementTerminationData(year=2021, engagements=5, terminations=2),
        EngagementTerminationData(year=2022, engagements=10, terminations=3),
        EngagementTerminationData(year=2023, engagements=8, terminations=4),
        EngagementTerminationData(year=2024, engagements=12, terminations=6)
    ]
    
    gender_data = [
        GenderData(gender="Male", count=63, percentage=62.38),
        GenderData(gender="Female", count=38, percentage=37.62)
    ]
    
    return SummaryDashboardData(
        selected_company=company,
        kpi_metrics=kpi_metrics,
        headcount_by_year=headcount_by_year,
        headcount_by_employment_type=employment_types,
        headcount_by_age_bracket=age_brackets,
        engagements_terminations=engagements_terminations,
        headcount_by_gender=gender_data,
        last_refreshed=datetime.now(timezone.utc).isoformat()
    )
