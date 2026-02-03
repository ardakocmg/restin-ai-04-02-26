from pydantic import BaseModel, Field
from typing import Dict, Any


class TablePreferences(BaseModel):
    id: str = Field(...)
    user_id: str
    venue_id: str
    table_id: str
    preferences: Dict[str, Any]
    updated_at: str
