"""Payroll Costs Models"""
from pydantic import BaseModel
from typing import List, Dict, Any


class PayrollCostMetrics(BaseModel):
    """Payroll cost metrics"""
    total_cost_ytd: float
    average_cost_per_employee: float
    by_department: List[Dict[str, Any]]
    by_cost_centre: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]  # Monthly trend
    overtime_costs: float
    benefits_costs: float
