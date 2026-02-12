"""Approval Center Routes — Unified approval workflow"""
from fastapi import APIRouter, Depends, HTTPException, Request
from models.approval_request import ApprovalRequest
from models.clocking_data import ClockingRecord
from core.dependencies import get_current_user, get_database
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import uuid

MALTA_TZ = ZoneInfo("Europe/Malta")

router = APIRouter(prefix="/approvals", tags=["Approval Center"])


# ── Request / Response Models ────────────────────────────
class SubmitApprovalRequest(BaseModel):
    type: str = "manual_clocking"
    payload: Dict[str, Any] = Field(default_factory=dict)
    reason: Optional[str] = None
    priority: str = "normal"
    assigned_to: Optional[str] = None
    # Device tracking
    device_info: Optional[Dict[str, Any]] = None
    geolocation: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class ReviewRequest(BaseModel):
    rejection_reason: Optional[str] = None


# ── POST /approvals/request — Submit a new approval ──────
@router.post("/request")
async def submit_approval_request(
    request: SubmitApprovalRequest,
    raw_request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Staff submits an approval request"""
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

    approval = ApprovalRequest(
        id=str(uuid.uuid4()),
        venue_id=venue_id,
        type=request.type,
        requester_id=user_id,
        requester_name=user_name,
        department=current_user.get("department"),
        assigned_to=request.assigned_to,
        status="pending",
        priority=request.priority,
        payload=request.payload,
        reason=request.reason,
        ip_address=client_ip,
        device_info=request.device_info,
        geolocation=request.geolocation,
    )

    await db["approval_requests"].insert_one(approval.model_dump(by_alias=True))

    return {
        "success": True,
        "request_id": approval.id,
        "status": "pending",
        "message": "Request submitted for approval"
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
    role = (current_user.get("role") or "").lower()

    # Role check
    if role not in ("manager", "owner", "product_owner", "hr", "admin"):
        raise HTTPException(status_code=403, detail="Only managers/HR can view pending approvals")

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
    """Get all approval requests with optional filters (Manager/HR)"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    role = (current_user.get("role") or "").lower()

    if role not in ("manager", "owner", "product_owner", "hr", "admin"):
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
    """Approve an approval request"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    role = (current_user.get("role") or "").lower()
    reviewer_id = current_user.get("userId") or current_user.get("id") or ""
    reviewer_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    if role not in ("manager", "owner", "product_owner", "hr", "admin"):
        raise HTTPException(status_code=403, detail="Only managers/HR can approve requests")

    # Find the request
    doc = await db["approval_requests"].find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if doc.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Request already {doc.get('status')}")

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
        now_malta = now.astimezone(MALTA_TZ)

        record = ClockingRecord(
            id=str(uuid.uuid4()),
            venue_id=venue_id,
            employee_id=doc["requester_id"],
            day_of_week=payload.get("day_of_week", now_malta.strftime("%A")),
            date=payload.get("date", now_malta.strftime("%d/%m/%Y")),
            clocking_in=payload.get("time_in", "09:00"),
            clocking_out=payload.get("time_out"),
            hours_worked=_calc_hours(payload.get("time_in", "09:00"), payload.get("time_out")),
            status="completed" if payload.get("time_out") else "active",
            employee_name=doc.get("requester_name", "Unknown"),
            cost_centre=payload.get("cost_centre", payload.get("work_area", "N/A")),
            work_area=payload.get("work_area"),
            source_device="manual_approved",
            device_name=f"Approved by {reviewer_name}",
            ip_address=doc.get("ip_address"),
            device_info=doc.get("device_info"),
            geolocation=doc.get("geolocation"),
            modified_by=reviewer_name,
            created_by=doc.get("requester_name", "Unknown"),
            remark=f"Approved by {reviewer_name} | {doc.get('reason', '')}",
        )
        await db["clocking_records"].insert_one(record.model_dump(by_alias=True))

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
    """Reject an approval request with reason"""
    role = (current_user.get("role") or "").lower()
    reviewer_id = current_user.get("userId") or current_user.get("id") or ""
    reviewer_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    if role not in ("manager", "owner", "product_owner", "hr", "admin"):
        raise HTTPException(status_code=403, detail="Only managers/HR can reject requests")

    doc = await db["approval_requests"].find_one({"id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval request not found")
    if doc.get("status") != "pending":
        raise HTTPException(status_code=409, detail=f"Request already {doc.get('status')}")

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
