"""Clocking Data Models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime, timezone
import uuid


class DeviceInfo(BaseModel):
    """Device fingerprint captured at clock-in time"""
    model_config = ConfigDict(extra="ignore")
    browser: Optional[str] = None        # "Chrome 120"
    os: Optional[str] = None             # "Windows 11"
    platform: Optional[str] = None       # "Desktop" / "Mobile" / "Tablet"
    user_agent: Optional[str] = None     # Full UA string
    screen_resolution: Optional[str] = None  # "1920x1080"
    language: Optional[str] = None       # "en-GB"


class GeoLocation(BaseModel):
    """GPS coordinates captured at clock-in/out"""
    model_config = ConfigDict(extra="ignore")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None     # Meters
    address: Optional[str] = None        # Reverse-geocoded (optional)
    timestamp: Optional[str] = None      # ISO timestamp of capture


class ClockingRecord(BaseModel):
    """Single clocking record"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    employee_id: str  # Link to employees collection
    day_of_week: str  # "Tuesday", "Wednesday"
    date: str  # "27/01/2026"
    clocking_in: str  # "16:26"
    clocking_out: Optional[str] = None  # "23:52" — None while active
    hours_worked: float = 0.0
    status: Literal["active", "completed"] = "completed"
    employee_name: str
    employee_designation: Optional[str] = None  # "(SUBCONTRACTED)"
    cost_centre: str  # "CAVFOH", "C&B FC"
    work_area: Optional[str] = None  # "FOH", "Kitchen", "Bar"
    source_device: Literal["terminal", "web_manual", "mobile_app", "kiosk", "import"] = "terminal"
    device_name: Optional[str] = None  # "Term_01", "Chrome/Desktop"
    shift_id: Optional[str] = None  # Link to shift calendar
    ip_address: Optional[str] = None  # Client IP at clock-in
    device_info: Optional[Dict[str, Any]] = None  # DeviceInfo dict
    geolocation: Optional[Dict[str, Any]] = None  # GeoLocation dict
    clock_out_geolocation: Optional[Dict[str, Any]] = None  # GeoLocation at clock-out
    modified_by: str  # "DeviceManager@00471"
    created_by: str
    remark: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ClockingDataRequest(BaseModel):
    """Request to fetch clocking data"""
    start_date: str  # "14.01.2026"
    end_date: str  # "28.01.2026"
    search_query: Optional[str] = None
