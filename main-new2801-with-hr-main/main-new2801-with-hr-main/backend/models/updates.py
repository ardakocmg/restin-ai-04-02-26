from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class UpdateChange(BaseModel):
    id: str = Field(...)
    title: str
    change_type: str
    domain: Optional[str] = None
    user_summary: Optional[str] = None
    technical_summary: Optional[str] = None
    created_at: str
    published: bool = False
    release_id: Optional[str] = None


class ReleaseNote(BaseModel):
    id: str = Field(...)
    version_code: str
    created_at: str
    user_notes: Dict[str, List[str]]
    technical_notes: Dict[str, List[str]]
    changes: List[Dict[str, Any]]
    published_by: Optional[str] = None
    published_role: Optional[str] = None
    auto_published: bool = False
