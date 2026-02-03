from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
from core.dependencies import get_current_user
from uuid import uuid4

router = APIRouter(prefix="/hr/leave", tags=["Leave Management Parity"])

# --- Models ---
class LeaveType(BaseModel):
    id: str
    name: str # Vacation, Sick Full, Sick Half, Bereavement, Marriage, Urgent Family
    color: str # #3B82F6 (Blue), #EF4444 (Red), etc.
    entitlement_hours: int # 192 for Vacation
    paid: bool = True

class LeaveBalance(BaseModel):
    employee_code: str
    year: int
    vacation_entitlement: float = 192.0
    vacation_taken: float = 0.0
    vacation_remaining: float = 192.0
    sick_full_entitlement: float = 80.0 # 10 days
    sick_full_taken: float = 0.0
    sick_half_entitlement: float = 80.0
    sick_half_taken: float = 0.0

class LeaveRequest(BaseModel):
    id: str
    employee_code: str
    employee_name: str
    leave_type_id: str
    start_date: str # YYYY-MM-DD
    end_date: str
    hours: float
    reason: Optional[str] = None
    status: str = "Pending" # Pending, Approved, Rejected
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: str

class LeaveRequestCreate(BaseModel):
    leave_type_id: str
    start_date: str
    end_date: str
    hours: float
    reason: str

# --- Mock Data ---
LEAVE_TYPES = [
    LeaveType(id="VAC", name="Vacation Leave", color="#3B82F6", entitlement_hours=192),
    LeaveType(id="SICK_FULL", name="Sick Leave (Full Pay)", color="#EF4444", entitlement_hours=80),
    LeaveType(id="SICK_HALF", name="Sick Leave (Half Pay)", color="#FCA5A5", entitlement_hours=80),
    LeaveType(id="URGENT", name="Urgent Family Leave", color="#F59E0B", entitlement_hours=15),
    LeaveType(id="BEREAVE", name="Bereavement Leave", color="#6B7280", entitlement_hours=24), # ~3 days
]

# Mock Store
LEAVE_REQUESTS: List[LeaveRequest] = [
    LeaveRequest(
        id="req_1",
        employee_code="1001",
        employee_name="DONALD AGIUS",
        leave_type_id="VAC",
        start_date="2026-02-15",
        end_date="2026-02-17",
        hours=24.0,
        reason="Family trip",
        status="Approved",
        approved_by="System Admin",
        created_at="2026-01-20T10:00:00"
    ),
    LeaveRequest(
        id="req_2",
        employee_code="1002",
        employee_name="ANNE FAITH ALINAN",
        leave_type_id="SICK_FULL",
        start_date="2026-01-28",
        end_date="2026-01-28",
        hours=8.0,
        reason="Flu",
        status="Pending",
        created_at="2026-01-28T08:30:00"
    )
]

# --- Endpoints ---

@router.get("/types", response_model=List[LeaveType])
async def get_leave_types(current_user: dict = Depends(get_current_user)):
    """Get all available leave types"""
    return LEAVE_TYPES

@router.get("/balances/{employee_code}", response_model=LeaveBalance)
async def get_leave_balance(employee_code: str, current_user: dict = Depends(get_current_user)):
    """Get leave balances for a specific employee"""
    # In a real app, calculate this dynamically from accepted requests.
    # Here we mock it.
    
    # Calculate taken VAC
    taken_vac = sum(r.hours for r in LEAVE_REQUESTS 
                   if r.employee_code == employee_code 
                   and r.leave_type_id == "VAC" 
                   and r.status == "Approved")
    
    taken_sick = sum(r.hours for r in LEAVE_REQUESTS 
                    if r.employee_code == employee_code 
                    and r.leave_type_id == "SICK_FULL" 
                    and r.status == "Approved")
                    
    return LeaveBalance(
        employee_code=employee_code,
        year=2026,
        vacation_taken=taken_vac,
        vacation_remaining=192.0 - taken_vac,
        sick_full_taken=taken_sick
    )

@router.get("/requests", response_model=List[LeaveRequest])
async def get_leave_requests(
    employee_code: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List leave requests with optional filtering"""
    filtered = LEAVE_REQUESTS
    if employee_code:
        filtered = [r for r in filtered if r.employee_code == employee_code]
    if status:
        filtered = [r for r in filtered if r.status.lower() == status.lower()]
    return filtered

@router.post("/request", response_model=LeaveRequest)
async def create_leave_request(
    request: LeaveRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a new leave request"""
    # In real app, fetch employee details from current_user or DB
    new_req = LeaveRequest(
        id=f"req_{str(uuid4())[:8]}",
        employee_code="1001", # Mock: Current user is Donald Agius
        employee_name="DONALD AGIUS",
        leave_type_id=request.leave_type_id,
        start_date=request.start_date,
        end_date=request.end_date,
        hours=request.hours,
        reason=request.reason,
        status="Pending",
        created_at=datetime.now().isoformat()
    )
    LEAVE_REQUESTS.append(new_req)
    return new_req

@router.put("/request/{request_id}/status")
async def update_request_status(
    request_id: str,
    status: str = Body(..., embed=True),
    reason: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Approve or Reject a leave request"""
    req = next((r for r in LEAVE_REQUESTS if r.id == request_id), None)
    if not req:
        raise HTTPException(404, "Request not found")
        
    if status not in ["Approved", "Rejected", "Pending"]:
        raise HTTPException(400, "Invalid status")
        
    req.status = status
    if status == "Rejected":
        req.rejection_reason = reason
    elif status == "Approved":
        req.approved_by = current_user.get("sub", "Admin")
        
    return req
