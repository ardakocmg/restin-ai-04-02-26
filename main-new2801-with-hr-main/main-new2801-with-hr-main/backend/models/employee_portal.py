"""Employee Portal Models"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class LeaveBalance(BaseModel):
    """Leave balance circular progress"""
    leave_type: str  # "Blood Donation", "Study Leave", etc.
    hours_left: int
    total_hours: int
    is_segmented: bool = False
    segments: Optional[List[Dict[str, Any]]] = None


class CalendarEvent(BaseModel):
    """Calendar event for leave planner"""
    date: str  # "YYYY-MM-DD"
    event_type: str  # "Public Holiday", "VAC24", "WORKING REMOTELY"
    color_code: str  # "green", "blue", "purple"


class PayslipItem(BaseModel):
    """Payslip thumbnail"""
    month: str  # "November 2023"
    thumbnail_url: Optional[str] = None
    payslip_id: str


class OutOfOfficeStaff(BaseModel):
    """Staff member out of office"""
    employee_id: str
    name: str
    profile_picture: Optional[str] = None
    leave_type: str  # "SICK LEAVE", "VACATION"
    start_time: str
    end_time: Optional[str] = None
    duration: Optional[str] = None
    is_sick: bool = False


class LeaveMetrics(BaseModel):
    """Leave metrics cards"""
    on_leave_today: int
    on_leave_tomorrow: int
    on_sick_leave_today: int


class MyProfile(BaseModel):
    """Employee profile widget"""
    name: str
    job_title: str
    profile_photo: Optional[str] = None


class EmployeePortalData(BaseModel):
    """Complete employee portal data"""
    my_profile: MyProfile
    leave_balances: List[LeaveBalance]
    calendar_events: List[CalendarEvent]
    date_range: Dict[str, str]  # {"start": "2024-11-01", "end": "2024-12-31"}
    payslips: List[PayslipItem]
    out_of_office: List[OutOfOfficeStaff]
    leave_metrics: LeaveMetrics
