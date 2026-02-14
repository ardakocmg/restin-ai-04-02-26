"""
HR Bridge Routes — URL Aliases
Maps frontend-expected URLs to existing backend route handlers.
The frontend calls:
  - /venues/{venue_id}/hr/leave-requests
  - /venues/{venue_id}/hr/leave-balances
  - /venues/{venue_id}/hr/payroll-runs
  - /venues/{venue_id}/hr/employees/{code}/notes
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.dependencies import get_current_user, get_database, check_venue_access
from core.database import db as module_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["HR Bridge"])


# ─── Leave Requests (alias for hr_leave_advanced) ──────────────────────
@router.get("/venues/{venue_id}/hr/leave-requests")
async def get_leave_requests_bridge(
    venue_id: str,
    employee_code: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Proxy: /hr/leave-requests → LeaveRequests collection"""
    await check_venue_access(current_user, venue_id)

    query = {"venue_id": venue_id}
    if employee_code:
        query["$or"] = [
            {"employee_id": employee_code},
            {"employee_code": employee_code},
        ]
    if status:
        query["status"] = status

    requests = await db.LeaveRequests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return requests


@router.patch("/venues/{venue_id}/hr/leave-requests/{request_id}")
async def update_leave_request_bridge(
    venue_id: str,
    request_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Proxy: PATCH /hr/leave-requests/{id} → update status"""
    await check_venue_access(current_user, venue_id)

    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if "status" in body:
        update["status"] = body["status"]
        if body["status"] == "approved":
            update["approved_by"] = current_user.get("id", "system")
        elif body["status"] == "rejected":
            update["rejected_by"] = current_user.get("id", "system")
            update["rejection_reason"] = body.get("reason", "")

    result = await db.LeaveRequests.update_one(
        {"id": request_id, "venue_id": venue_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Leave request not found")
    return {"message": "Leave request updated"}


# ─── Leave Balances (alias) ────────────────────────────────────────────
@router.get("/venues/{venue_id}/hr/leave-balances")
async def get_leave_balances_bridge(
    venue_id: str,
    employee_code: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Proxy: /hr/leave-balances → LeaveBalances collection"""
    await check_venue_access(current_user, venue_id)

    query = {"venue_id": venue_id}
    if employee_code:
        query["$or"] = [
            {"employee_id": employee_code},
            {"employee_code": employee_code},
        ]

    balances = await db.LeaveBalances.find(query, {"_id": 0}).to_list(500)

    # If no records found, return sensible defaults for Malta
    if not balances and employee_code:
        return [{
            "employee_id": employee_code,
            "venue_id": venue_id,
            "year": datetime.now().year,
            "leave_type": "vacation",
            "entitlement": 192,
            "used": 0,
            "pending": 0,
            "balance": 192,
        }]
    return balances


# ─── Payroll Runs (alias for hr_payroll_advanced) ──────────────────────
@router.get("/venues/{venue_id}/hr/payroll-runs")
async def get_payroll_runs_bridge(
    venue_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Proxy: /hr/payroll-runs → payroll_runs collection"""
    await check_venue_access(current_user, venue_id)

    if venue_id == "all":
        query = {}
    else:
        query = {"$or": [{"venue_id": venue_id}, {"venue_id": "all"}]}

    runs = await db.payroll_runs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return runs


# ─── Employee Notes ────────────────────────────────────────────────────
@router.get("/venues/{venue_id}/hr/employees/{employee_code}/notes")
async def get_employee_notes(
    venue_id: str,
    employee_code: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get notes for a specific employee"""
    await check_venue_access(current_user, venue_id)

    notes = await db.employee_notes.find(
        {"venue_id": venue_id, "employee_code": employee_code},
        {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return notes


@router.post("/venues/{venue_id}/hr/employees/{employee_code}/notes")
async def create_employee_note(
    venue_id: str,
    employee_code: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Add a note to an employee record"""
    await check_venue_access(current_user, venue_id)

    note = {
        "id": f"note-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "employee_code": employee_code,
        "content": body.get("content", ""),
        "type": body.get("type", "general"),
        "created_by": current_user.get("id", "system"),
        "created_by_name": current_user.get("name", current_user.get("sub", "System")),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.employee_notes.insert_one(note)
    note.pop("_id", None)
    return note


def create_hr_bridge_router():
    return router
