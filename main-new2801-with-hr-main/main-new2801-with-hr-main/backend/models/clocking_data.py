"""Clocking Data Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class ClockingRecord(BaseModel):
    """Single clocking record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    day_of_week: str  # "Tuesday", "Wednesday"
    date: str  # "27/01/2026"
    clocking_in: str  # "16:26"
    clocking_out: str  # "23:52"
    employee_name: str
    employee_designation: Optional[str] = None  # "(SUBCONTRACTED)"
    cost_centre: str  # "CAVFOH", "C&B FC"
    modified_by: str  # "DeviceManager@00471"
    created_by: str
    remark: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ClockingDataRequest(BaseModel):
    """Request to fetch clocking data"""
    start_date: str  # "14.01.2026"
    end_date: str  # "28.01.2026"
    search_query: Optional[str] = None
