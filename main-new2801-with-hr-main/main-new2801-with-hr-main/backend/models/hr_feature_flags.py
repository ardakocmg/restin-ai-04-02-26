from pydantic import BaseModel, Field
from typing import List, Optional


class HRFeatureFlag(BaseModel):
    id: str = Field(...)
    venue_id: str
    module_key: str
    enabled: bool
    roles: List[str] = []
    updated_at: str
    updated_by: Optional[str] = None
