"""Forecast Run model"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from uuid import uuid4

class ForecastRun(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    venue_id: str
    model_type: str = "SALES"  # SALES | LABOR | INVENTORY
    horizon_days: int = 56
    status: str = "RUNNING"  # RUNNING | COMPLETED | FAILED
    series_output_id: str = ""
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: str = ""
