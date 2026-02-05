from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class MigrationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    source: str  # apicbase, lightspeed, shireburn
    mode: str = "migrate"  # migrate, link
    status: str = "pending"  # pending, in_progress, completed, failed
    summary: Optional[str] = None
    details: Optional[Dict[str, Any]] = None  # JSON details of conflict/results
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    created_by: Optional[str] = None
