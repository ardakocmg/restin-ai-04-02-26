"""Error Registry model"""
from pydantic import BaseModel
from typing import List

class ErrorRegistry(BaseModel):
    error_code: str
    title: str
    description: str
    common_causes: List[str] = []
    suggested_actions: List[str] = []
    severity: str = "MED"
    created_at: str
