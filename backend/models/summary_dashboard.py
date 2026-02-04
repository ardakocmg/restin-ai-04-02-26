"""Summary Dashboard Models"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone


class KPIMetric(BaseModel):
    """KPI Metric for dashboard"""
    label: str
    value: Any
    timeframe: str = "Year To Date"
    icon: str


class HeadcountDataPoint(BaseModel):
    """Single data point for headcount chart"""
    year: int
    month: Optional[int] = None
    count: int


class EmploymentTypeData(BaseModel):
    """Employment type distribution"""
    type_name: str
    count: int


class AgeBracketData(BaseModel):
    """Age bracket distribution"""
    bracket: str  # "Up to 29 years", "30-39 years", etc.
    count: int


class EngagementTerminationData(BaseModel):
    """Engagement and termination data by year"""
    year: int
    engagements: int
    terminations: int


class GenderData(BaseModel):
    """Gender distribution"""
    gender: str  # "Male", "Female"
    count: int
    percentage: float


class SummaryDashboardData(BaseModel):
    """Complete summary dashboard data"""
    selected_company: str = "All"
    kpi_metrics: List[KPIMetric]
    headcount_by_year: List[HeadcountDataPoint]
    headcount_by_employment_type: List[EmploymentTypeData]
    headcount_by_age_bracket: List[AgeBracketData]
    engagements_terminations: List[EngagementTerminationData]
    headcount_by_gender: List[GenderData]
    last_refreshed: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
