"""Explain Why Chain model"""
from pydantic import BaseModel
from typing import List

class WhyChain(BaseModel):
    finding_id: str
    rule_id: str = ""
    threshold_values: dict = {}
    historical_comparison: dict = {}
    explanation_steps: List[str] = []
