
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class FiscalDrift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str
    fiscal_period: str
    theoretical_tax: int
    actual_tax: int
    drift_cents: int
    drift_percentage: float
    status: str = "PENDING"
    details: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
