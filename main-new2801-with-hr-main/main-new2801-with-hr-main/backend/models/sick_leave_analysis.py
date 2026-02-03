"""Sick Leave Analysis Models"""
from pydantic import BaseModel
from typing import List, Dict, Any


class SickLeaveMetrics(BaseModel):
    """Sick leave analysis"""
    total_sick_days: int
    employees_on_sick_leave: int
    average_sick_days_per_employee: float
    by_department: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]  # Monthly trend
    top_reasons: List[Dict[str, Any]]
