from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

class RmKdsItemStatsDaily(BaseModel):
    """Read model for daily KDS item production statistics"""
    venue_id: str
    day: str  # YYYY-MM-DD
    item_id: str
    item_name: str
    station_key: str
    
    produced_count: int = 0
    fastest_ms: Optional[int] = None
    slowest_ms: Optional[int] = None
    average_ms: Optional[int] = None
    total_time_ms: int = 0
    
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
