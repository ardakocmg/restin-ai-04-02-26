"""Turnover Module Models"""
from pydantic import BaseModel
from typing import List, Dict, Any


class TurnoverMetrics(BaseModel):
    """Turnover metrics"""
    voluntary_terminations: int
    non_voluntary_terminations: int
    turnover_rate: float  # Percentage
    by_department: List[Dict[str, Any]]
    by_reason: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]  # Monthly trend
