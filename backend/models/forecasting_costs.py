"""Forecasting Costs Models"""
from pydantic import BaseModel
from typing import List, Dict, Any


class ForecastingCostMetrics(BaseModel):
    """Forecasting cost metrics"""
    projected_costs_next_quarter: float
    projected_headcount_next_quarter: int
    cost_variance: float  # vs last quarter
    by_department: List[Dict[str, Any]]
    trend_forecast: List[Dict[str, Any]]  # Next 12 months
