"""Kill Switch model"""
from pydantic import BaseModel
from datetime import datetime, timezone

class KillSwitch(BaseModel):
    id: str
    venue_id: str
    key: str  # e.g., "inventory.deduction.recipe"
    enabled: bool = True
    reason: str = ""
    updated_by: str
    updated_at: str = datetime.now(timezone.utc).isoformat()
