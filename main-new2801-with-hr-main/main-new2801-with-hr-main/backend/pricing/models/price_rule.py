from pydantic import BaseModel
from typing import Dict, Any, List

class PriceRule(BaseModel):
    """Advanced pricing rule (future expansion)"""
    conditions: Dict[str, Any]  # {"day_of_week": [1,2,3], "time_range": ["18:00", "21:00"]}
    action: Dict[str, Any]  # {"type": "percentage_discount", "value": 20}
    priority: int = 0
