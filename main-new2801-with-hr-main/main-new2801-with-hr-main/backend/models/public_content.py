from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from enum import Enum


class ContentStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    ARCHIVED = "ARCHIVED"


class PublicContentVersion(BaseModel):
    id: str = Field(...)
    type: str
    status: ContentStatus
    version: str
    content: Dict[str, Any]
    changelog: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None
    created_by_role: Optional[str] = None
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    approved_by_role: Optional[str] = None
    updated_at: Optional[str] = None
    scheduled_publish_at: Optional[str] = None
