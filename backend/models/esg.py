"""ESG Module Models"""
from pydantic import BaseModel
from typing import List, Dict, Any


class ESGMetrics(BaseModel):
    """ESG (Environmental, Social, Governance) metrics"""
    diversity_score: float
    gender_pay_gap: float
    employee_satisfaction: float
    training_hours_per_employee: float
    safety_incidents: int
    carbon_footprint: Dict[str, Any]
