"""Analytics models"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4

class AnalyticsTile(BaseModel):
    tile_id: str
    type: str
    query_ref: str
    params: dict = {}
    layout: dict = {}

class AnalyticsDashboard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    display_id: str = ""
    venue_id: str
    name: str
    tiles: List[AnalyticsTile] = []
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MetricDefinition(BaseModel):
    metric_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    source_events: List[str] = []
    compute: str
    schema_version: int = 1

class MetricSnapshot(BaseModel):
    venue_id: str
    metric_id: str
    window: str
    value: float
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
