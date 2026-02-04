from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class TablePreset(BaseModel):
    id: str = Field(...)
    table_id: str
    venue_id: str
    name: str
    scope: str  # USER | ROLE
    user_id: Optional[str] = None
    role: Optional[str] = None
    state: Dict[str, Any]
    created_at: str
    created_by: str
    created_by_role: Optional[str] = None
