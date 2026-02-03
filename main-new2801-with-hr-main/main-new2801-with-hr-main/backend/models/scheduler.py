"""Scheduler Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class SchedulerCell(BaseModel):
    """Single cell in scheduler"""
    cell_type: str  # "OFF_DAY", "WORK_SHIFT", "EMPTY"
    role: Optional[str] = None  # "(d)DRFOHD", "(d)C&B-KITCHEN"
    start_time: Optional[str] = None  # "15:00"
    end_time: Optional[str] = None  # "23:00"
    background_color: str = "white"  # "pink", "blue", "white"


class SchedulerRow(BaseModel):
    """Single row in scheduler (one employee)"""
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_name: str
    occupation: str
    cost_centre: str
    venue: str = "TBA"
    vendor: str = "TBA"
    basic_hrs_overtime: str = "0h 0m"
    cost_eur: float = 0.0
    # Any other fields like monday, tuesday, or date strings will be handled by extra="allow"


class SchedulerWeekData(BaseModel):
    """Complete scheduler data for a week"""
    week_start: str  # "2026-01-26"
    week_end: str  # "2026-02-01"
    rows: List[SchedulerRow]


class SchedulerUpdateRequest(BaseModel):
    """Request to update a scheduler cell"""
    row_id: str
    day: str  # "monday", "tuesday", etc.
    cell_data: SchedulerCell
