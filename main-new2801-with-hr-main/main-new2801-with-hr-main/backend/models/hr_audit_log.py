from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class HRAuditLog(BaseModel):
    id: str = Field(...)
    venue_id: str
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity: str
    details: Dict[str, Any]
    created_at: str
