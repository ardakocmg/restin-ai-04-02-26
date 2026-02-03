"""Headcount Module Models"""
from pydantic import BaseModel
from typing import List, Dict, Any


class HeadcountMetrics(BaseModel):
    """Headcount metrics"""
    total_headcount: int
    new_employees_ytd: int
    terminated_ytd: int
    by_department: List[Dict[str, Any]]
    by_employment_type: List[Dict[str, Any]]
    by_location: List[Dict[str, Any]]
    trend_data: List[Dict[str, Any]]  # Monthly trend
