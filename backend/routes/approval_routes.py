import logging
logger = logging.getLogger(__name__)

"""Approval Center Routes — Unified approval workflow with venue config integration"""
from fastapi import APIRouter, Depends, HTTPException, Request
from models.approval_request import ApprovalRequest
from models.clocking_data import ClockingRecord
from core.dependencies import get_current_user, get_database
from core.venue_config import get_venue_config, DEFAULTS
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import uuid

MALTA_TZ = ZoneInfo("Europe/Malta")

# Default approval settings reference
DEFAULT_APPROVAL = DEFAULTS["rules"]["approval"]

router = APIRouter(prefix="/approvals", tags=["Approval Center"])


# ── Request / Response Models ────────────────────────────
class SubmitApprovalRequest(BaseModel):
    type: str = "manual_clocking"
    payload: Dict[str, Any] = Field(default_factory=dict)
    reason: Optional[str] = None
    priority: str = "normal"
    assigned_to: Optional[str] = None
    source: str = "staff_app"  # staff_app | auto | shift_mismatch
    # Device tracking
    device_info: Optional[Dict[str, Any]] = None
    geolocation: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class ReviewRequest(BaseModel):
    rejection_reason: Optional[str] = None


# ── Helper: get approval config for a type ───────────────
async def _get_approval_config(venue_id: str, approval_type: str) -> dict:
    """Get the merged approval config for a specific type from venue settings"""
    try:
        cfg = await get_venue_config(venue_id)
        venue_approval = cfg.get("rules", {}).get("approval", {})
        defaults = DEFAULT_APPROVAL.get(approval_type, {})
        venue_type_cfg = venue_approval.get(approval_type, {})
        return {**defaults, **venue_type_cfg}
    except Exception as e:
        logger.warning(f"Silenced error: {e}")
        return DEFAULT_APPROVAL.get(approval_type, {})


# ── Helper: check if user can approve ────────────────────
def _can_user_approve(current_user: dict, approval_cfg: dict) -> bool:
    """Check if user's role or ID is in the allowed approvers"""
    role = (current_user.get("role") or "").lower()
    user_id = current_user.get("userId") or current_user.get("id") or ""

    allowed_roles = approval_cfg.get("allowed_approvers", ["manager", "owner", "hr"])
    specific_ids = approval_cfg.get("specific_approver_ids", [])

    # Check role
    if role in allowed_roles:
        return True
    # product_owner is always an alias for owner
    if role == "product_owner" and "owner" in allowed_roles:
        return True
    # admin always allowed
    if role == "admin":
        return True
    # Check specific user ID
    if user_id and specific_ids and user_id in specific_ids:
        return True

    return False


# ── Helper: check if approval is needed ──────────────────
def _requires_approval(approval_cfg: dict, source: str) -> bool:
    """Determine if approval is needed based on config + source"""
    if source == "staff_app":
        return approval_cfg.get("staff_app_requires_approval", True)
    elif source == "auto":
        return approval_cfg.get("auto_clocking_requires_approval", False)
    elif source == "shift_mismatch":
        return approval_cfg.get("shift_mismatch_requires_approval", True)
    else:
        # Generic types (leave, expense)
        return approval_cfg.get("requires_approval", True)


# ── POST /approvals/request — Submit a new approval ──────
@router.post("/request")
async def submit_approval_request(
    request: SubmitApprovalRequest,
    raw_request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Staff submits an approval request — may auto-approve based on venue config"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_id = current_user.get("userId") or current_user.get("id") or ""
    user_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    # Capture IP
    client_ip = request.ip_address
    if not client_ip:
        forwarded = raw_request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif raw_request.client:
            client_ip = raw_request.client.host

    # Get venue approval config for this type
    approval_cfg = await _get_approval_config(venue_id, request.type)

    # Check if auto-approve is enabled
    auto_approve = approval_cfg.get("auto_approve_enabled", False)

    # Check if approval is actually required for this source
    needs_approval = _requires_approval(approval_cfg, request.source)

    if not needs_approval or auto_approve:
        # Auto-approve: create record directly
        status = "approved"
        message = "Auto-approved based on venue settings"
    else:
        status = "pending"
        message = "Request submitted for approval"

    approval = ApprovalRequest(
        id=str(uuid.uuid4()),
        venue_id=venue_id,
        type=request.type,
        requester_id=user_id,
        requester_name=user_name,
        department=current_user.get("department"),
        assigned_to=request.assigned_to,
        status=status,
        priority=request.priority,
        payload={**request.payload, "source": request.source},
        reason=request.reason,
        ip_address=client_ip,
        device_info=request.device_info,
        geolocation=request.geolocation,
    )

    now = datetime.now(timezone.utc)

    if status == "approved":
        approval.reviewed_by = "SYSTEM"
        approval.reviewed_by_name = "Auto-Approved"
        approval.reviewed_at = now.isoformat()

    await db["approval_requests"].insert_one(approval.model_dump(by_alias=True))

    # If auto-approved AND manual_clocking → create clocking record
    if status == "approved" and request.type == "manual_clocking":
        await _create_clocking_record(
            db, venue_id, user_id, user_name,
            request.payload, "Auto-Approved", request.reason,
            request.ip_address, request.device_info, request.geolocation
        )

    return {
        "success": True,
        "request_id": approval.id,
        "status": status,
        "auto_approved": status == "approved",
        "message": message
    }


# ── GET /approvals/pending — List pending for reviewers ──
@router.get("/pending")
async def get_pending_approvals(
    type_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get pending approval requests (Manager/HR only)"""
    venue_id = current_user.get("venueId") or "GLOBAL"

    # Check if user can review using venue config
    approval_cfg = await _get_approval_config(venue_id, "manual_clocking")
    if not _can_user_approve(current_user, approval_cfg):
        raise HTTPException(status_code=403, detail="You are not authorized to view pending approvals")

    query: Dict[str, Any] = {"status": "pending"}
    if venue_id != "GLOBAL":
        query["venue_id"] = venue_id
    if type_filter:
        query["type"] = type_filter

    cursor = db["approval_requests"].find(query).sort("created_at", -1)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)

    return results


# ── GET /approvals/all — All requests with filters ───────
@router.get("/all")
async def get_all_approvals(
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all approval requests with optional filters (authorized approvers)"""
    venue_id = current_user.get("venueId") or "GLOBAL"

    approval_cfg = await _get_approval_config(venue_id, "manual_clocking")
    if not _can_user_approve(current_user, approval_cfg):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query: Dict[str, Any] = {}
    if venue_id != "GLOBAL":
        query["venue_id"] = venue_id
    if type_filter:
        query["type"] = type_filter
    if status_filter:
        query["status"] = status_filter

    cursor = db["approval_requests"].find(query).sort("created_at", -1)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)

    return results


# ── GET /approvals/my-requests — Staff's own requests ────
@router.get("/my-requests")
async def get_my_requests(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get current user's submitted requests"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_id = current_user.get("userId") or current_user.get("id") or ""

    query: Dict[str, Any] = {"requester_id": user_id}
    if venue_id != "GLOBAL":
        query["venue_id"] = venue_id

    cursor = db["approval_requests"].find(query).sort("created_at", -1)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)

    return results


# ── GET /approvals/stats — Summary counts ────────────────
@router.get("/stats")
async def get_approval_stats(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get approval counts by type and status"""
    venue_id = current_user.get("venueId") or "GLOBAL"

    pipeline = [
        {"$match": {"venue_id": venue_id} if venue_id != "GLOBAL" else {}},
        {"$group": {
            "_id": {"type": "$type", "status": "$status"},
            "count": {"$sum": 1}
        }}
    ]

    cursor = db["approval_requests"].aggregate(pipeline)
    stats: Dict[str, Any] = {
        "total_pending": 0,
        "by_type": {},
        "by_status": {"pending": 0, "approved": 0, "rejected": 0, "cancelled": 0}
    }

    async for doc in cursor:
        t = doc["_id"]["type"]
        s = doc["_id"]["status"]
        c = doc["count"]

        if t not in stats["by_type"]:
            stats["by_type"][t] = {"pending": 0, "approved": 0, "rejected": 0, "cancelled": 0}
        stats["by_type"][t][s] = c
        stats["by_status"][s] = stats["by_status"].get(s, 0) + c
        if s == "pending":
            stats["total_pending"] += c

    return stats


# ── POST /approvals/{id}/approve — Approve request ───────
@router.post("/{request_id}/approve")
async def approve_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Approve an approval request — checks approver permissions from venue config"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    reviewer_id = current_user.get("userId") or current_user.get("id") or ""
    reviewer_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    # Find the request
    doc = await db["approval_requests"].find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if doc.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Request already {doc.get('status')}")

    # Check if the user is an authorized approver for this type
    approval_cfg = await _get_approval_config(doc.get("venue_id", venue_id), doc.get("type", "manual_clocking"))
    if not _can_user_approve(current_user, approval_cfg):
        raise HTTPException(status_code=403, detail="You are not authorized to approve this type of request")

    now = datetime.now(timezone.utc)

    # Update status
    await db["approval_requests"].update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "reviewed_by": reviewer_id,
            "reviewed_by_name": reviewer_name,
            "reviewed_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }}
    )

    # If manual_clocking → create the actual ClockingRecord
    if doc.get("type") == "manual_clocking":
        payload = doc.get("payload", {})
        await _create_clocking_record(
            db, venue_id, doc["requester_id"], doc.get("requester_name", "Unknown"),
            payload, reviewer_name, doc.get("reason"),
            doc.get("ip_address"), doc.get("device_info"), doc.get("geolocation")
        )

    # If manual_clock_entry → insert the pre-built clocking record directly
    if doc.get("type") == "manual_clock_entry":
        payload = doc.get("payload", {})
        if payload:
            payload["approved_by"] = reviewer_name
            payload["approved_at"] = now.isoformat()
            payload.pop("_id", None)  # Remove mongo _id if present
            await db["clocking_records"].insert_one(payload)

    return {
        "success": True,
        "request_id": request_id,
        "status": "approved",
        "reviewed_by": reviewer_name
    }


# ── POST /approvals/{id}/reject — Reject request ────────
@router.post("/{request_id}/reject")
async def reject_request(
    request_id: str,
    review: ReviewRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Reject an approval request with reason — checks approver permissions"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    reviewer_id = current_user.get("userId") or current_user.get("id") or ""
    reviewer_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    doc = await db["approval_requests"].find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if doc.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Request already {doc.get('status')}")

    # Check if the user is an authorized approver
    approval_cfg = await _get_approval_config(doc.get("venue_id", venue_id), doc.get("type", "manual_clocking"))
    if not _can_user_approve(current_user, approval_cfg):
        raise HTTPException(status_code=403, detail="You are not authorized to reject this type of request")

    now = datetime.now(timezone.utc)

    await db["approval_requests"].update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "reviewed_by": reviewer_id,
            "reviewed_by_name": reviewer_name,
            "reviewed_at": now.isoformat(),
            "rejection_reason": review.rejection_reason or "No reason provided",
            "updated_at": now.isoformat(),
        }}
    )

    return {
        "success": True,
        "request_id": request_id,
        "status": "rejected",
        "reviewed_by": reviewer_name
    }


# ── Helper: Create clocking record from payload ──────────
async def _create_clocking_record(
    db, venue_id: str, employee_id: str, employee_name: str,
    payload: dict, reviewer_name: str, reason: Optional[str],
    ip_address: Optional[str], device_info: Optional[dict],
    geolocation: Optional[dict]
):
    """Create a ClockingRecord when a manual clocking request is approved"""
    now = datetime.now(timezone.utc)
    now_malta = now.astimezone(MALTA_TZ)

    record = ClockingRecord(
        id=str(uuid.uuid4()),
        venue_id=venue_id,
        employee_id=employee_id,
        day_of_week=payload.get("day_of_week", now_malta.strftime("%A")),
        date=payload.get("date", now_malta.strftime("%d/%m/%Y")),
        clocking_in=payload.get("time_in", "09:00"),
        clocking_out=payload.get("time_out"),
        hours_worked=_calc_hours(payload.get("time_in", "09:00"), payload.get("time_out")),
        status="completed" if payload.get("time_out") else "active",
        employee_name=employee_name,
        cost_centre=payload.get("cost_centre", payload.get("work_area", "N/A")),
        work_area=payload.get("work_area"),
        source_device="manual_approved",
        device_name=f"Approved by {reviewer_name}",
        ip_address=ip_address,
        device_info=device_info,
        geolocation=geolocation,
        modified_by=reviewer_name,
        created_by=employee_name,
        remark=f"Approved by {reviewer_name} | {reason or ''}",
    )
    await db["clocking_records"].insert_one(record.model_dump(by_alias=True))


# ── Helper: Calculate hours between two HH:MM strings ────
def _calc_hours(time_in: str, time_out: Optional[str]) -> float:
    if not time_out:
        return 0.0
    try:
        cin = datetime.strptime(time_in, "%H:%M")
        cout = datetime.strptime(time_out, "%H:%M")
        diff_minutes = (cout - cin).total_seconds() / 60
        if diff_minutes < 0:
            diff_minutes += 1440
        return round(diff_minutes / 60, 2)
    except (ValueError, TypeError):
        return 0.0
