"""Advanced HR Analytics Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class HeadcountMetrics(BaseModel):
    """Headcount metrics"""
    total_headcount: int
    active: int
    on_leave: int
    terminated: int
    new_employees_ytd: int
    terminated_ytd: int
    by_department: List[Dict[str, Any]]
    by_employment_type: List[Dict[str, Any]]
    by_location: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]  # Monthly trend
    department_breakdown: Dict[str, int]
    role_breakdown: Dict[str, int]


class TurnoverMetrics(BaseModel):
    """Turnover metrics"""
    period_start: str
    period_end: str
    voluntary_terminations: int
    non_voluntary_terminations: int
    voluntary_exits: int
    involuntary_exits: int
    turnover_rate: float
    retention_rate: float
    avg_tenure_days: float
    by_department: List[Dict[str, Any]]
    by_reason: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]


class CostMetrics(BaseModel):
    """Cost metrics"""
    total_payroll_cost: float
    cost_per_employee: float
    benefits_cost: float
    overtime_cost: float
    training_cost: float
    recruitment_cost: float


class HRAnalyticsSnapshot(BaseModel):
    """HR analytics snapshot"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    snapshot_date: str
    headcount: HeadcountMetrics
    turnover: TurnoverMetrics
    costs: CostMetrics
    leave_utilization: Dict[str, Any]
    performance_summary: Dict[str, Any]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
