"""ViewState model - User-specific page state"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

class ViewStateUI(BaseModel):
    filters_open: bool = True
    filter_sections: dict = {}  # {"status": true, "dates": false}
    columns: Optional[dict] = None
    density: Optional[str] = "NORMAL"

class ViewStateQuery(BaseModel):
    q: str = ""
    filters: dict = {}
    sort: str = "name"
    page_size: int = 50

class ViewState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    identity_id: str  # User's identity
    page_key: str  # e.g., "inventory.items"
    state_version: int = 1
    is_default: bool = False
    ui: ViewStateUI = Field(default_factory=ViewStateUI)
    query: ViewStateQuery = Field(default_factory=ViewStateQuery)
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
