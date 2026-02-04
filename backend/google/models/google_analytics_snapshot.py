"""Google Analytics Snapshot model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class GoogleAnalyticsSnapshot(BaseModel):
    venue_id: str
    property_id: str
    date: str
    metrics: dict = {}  # {"sessions": 0, "page_views": 0, "qr_scans": 0}
    captured_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
