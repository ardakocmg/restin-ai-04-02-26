"""Employee Portal Routes"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from models.employee_portal import (
    EmployeePortalData, MyProfile, LeaveBalance, CalendarEvent,
    PayslipItem, OutOfOfficeStaff, LeaveMetrics
)
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone

router = APIRouter(prefix="/employee-portal", tags=["Employee Portal"])


@router.get("/data", response_model=EmployeePortalData)
async def get_employee_portal_data(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get employee portal data"""
    
    my_profile = MyProfile(
        name="Emily Lloyd",
        job_title="Head Human Resources",
        profile_photo=None
    )
    
    leave_balances = [
        LeaveBalance(leave_type="Blood Donation", hours_left=8, total_hours=20),
        LeaveBalance(leave_type="Study Leave", hours_left=12, total_hours=20),
        LeaveBalance(leave_type="Vacation Leave 2023", hours_left=0, total_hours=160),
        LeaveBalance(
            leave_type="Vacation Leave 2024",
            hours_left=38,
            total_hours=160,
            is_segmented=True,
            segments=[{"type": "accrued", "hours": 30}, {"type": "pending", "hours": 8}]
        )
    ]
    
    calendar_events = [
        CalendarEvent(date="2024-11-11", event_type="WORKING REMOTELY", color_code="purple"),
        CalendarEvent(date="2024-11-13", event_type="CURRENT", color_code="blue"),
        CalendarEvent(date="2024-11-22", event_type="Public Holiday", color_code="yellow"),
        CalendarEvent(date="2024-12-13", event_type="Public Holiday", color_code="green"),
        CalendarEvent(date="2024-12-25", event_type="Public Holiday", color_code="green")
    ]
    
    payslips = [
        PayslipItem(month="November 2023", payslip_id="pay_001"),
        PayslipItem(month="December 2023", payslip_id="pay_002"),
        PayslipItem(month="January 2024", payslip_id="pay_003")
    ]
    
    out_of_office = [
        OutOfOfficeStaff(
            employee_id="emp_001",
            name="Alexis Georgoulis",
            leave_type="SICK LEAVE",
            start_time="08:00",
            end_time="13:00",
            is_sick=True
        ),
        OutOfOfficeStaff(
            employee_id="emp_002",
            name="Eugene Nash",
            leave_type="VACATION",
            start_time="08:00",
            duration="until 13/11/2024"
        )
    ]
    
    leave_metrics = LeaveMetrics(
        on_leave_today=9,
        on_leave_tomorrow=12,
        on_sick_leave_today=5
    )
    
    return EmployeePortalData(
        my_profile=my_profile,
        leave_balances=leave_balances,
        calendar_events=calendar_events,
        date_range={"start": "2024-11-01", "end": "2024-12-31"},
        payslips=payslips,
        out_of_office=out_of_office,
        leave_metrics=leave_metrics
    )


class ProfileUpdateRequest(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    preferred_language: Optional[str] = None


@router.get("/my-profile")
async def get_my_real_profile(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get the current user's real profile from employees collection."""
    user_id = current_user.get("userId") or current_user.get("id")
    venue_id = current_user.get("venueId") or current_user.get("venue_id")

    employee = await db.employees.find_one(
        {"id": user_id, "venue_id": venue_id},
        {"_id": 0}
    )

    if not employee:
        # Fallback to user data
        return {
            "name": current_user.get("fullName") or current_user.get("name", "Unknown"),
            "email": current_user.get("email", ""),
            "role": current_user.get("role", "staff"),
            "editable_fields": ["phone", "address", "emergency_contact_name", "emergency_contact_phone"]
        }

    return {
        **employee,
        "editable_fields": ["phone", "address", "emergency_contact_name", "emergency_contact_phone", "bank_name", "iban", "preferred_language"]
    }


@router.put("/my-profile")
async def update_my_profile(
    updates: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Allow employee to update their own profile (limited fields only)."""
    user_id = current_user.get("userId") or current_user.get("id")
    venue_id = current_user.get("venueId") or current_user.get("venue_id")

    # Only allow specific fields to be self-edited
    allowed_updates = {}
    update_dict = updates.model_dump(exclude_none=True)

    for field in ["phone", "address", "emergency_contact_name", "emergency_contact_phone", "bank_name", "iban", "preferred_language"]:
        if field in update_dict:
            allowed_updates[field] = update_dict[field]

    if not allowed_updates:
        raise HTTPException(400, "No valid fields to update")

    from datetime import datetime, timezone
    allowed_updates["profile_updated_at"] = datetime.now(timezone.utc).isoformat()
    allowed_updates["profile_updated_by"] = "self"

    result = await db.employees.update_one(
        {"id": user_id, "venue_id": venue_id},
        {"$set": allowed_updates}
    )

    return {"message": "Profile updated", "updated_fields": list(allowed_updates.keys())}

