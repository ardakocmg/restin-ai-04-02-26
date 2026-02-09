from fastapi import APIRouter, HTTPException, Body, Query, Request
from typing import List, Dict, Optional
import json
import os
from datetime import datetime, timezone
from .models import Employee, Payslip
from .services import PayrollService
from app.core.database import get_database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hr", tags=["HR"])

# Mock Data Loader (Replace with DB Repo later)
def load_mock_employees() -> List[Employee]:
    try:
        # Path relative to backend root or absolute
        path = os.path.join(os.path.dirname(__file__), "../../../../frontend/src/data/seed-master.json")
        with open(path, 'r') as f:
            data = json.load(f)
            return [Employee(**e) for e in data.get("employees", [])]
    except Exception as e:
        print(f"Error loading seeds: {e}")
        return []

@router.get("/employees", response_model=List[Employee])
def get_employees():
    return load_mock_employees()

@router.post("/payroll/calculate", response_model=List[Payslip])
def run_payroll(
    period_start: datetime = Body(..., example="2026-02-01T00:00:00Z"),
    period_end: datetime = Body(..., example="2026-02-28T23:59:59Z"),
    venue_id: str = Body(..., example="venue-caviar-bull")
):
    employees = load_mock_employees()
    venue_employees = [e for e in employees if e.venue_id == venue_id]
    
    if not venue_employees:
        return []
        
    return PayrollService.run_payroll_batch(venue_employees, period_start, period_end)


# ==================== PAYSLIP DETAIL ====================

@router.get("/payslips/{payslip_id}")
async def get_payslip(payslip_id: str):
    """Get a single payslip by ID from MongoDB."""
    db = get_database()
    payslip = await db.payslips.find_one({"id": payslip_id})
    
    if not payslip:
        # Fallback: try by _id
        from bson import ObjectId
        try:
            payslip = await db.payslips.find_one({"_id": ObjectId(payslip_id)})
        except Exception:
            pass
    
    if not payslip:
        raise HTTPException(404, "Payslip not found")
    
    payslip["_id"] = str(payslip["_id"])
    return payslip


@router.get("/payslips")
async def list_payslips(
    employee_id: Optional[str] = Query(None),
    venue_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
):
    """List payslips from MongoDB with optional filters."""
    db = get_database()
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if venue_id:
        query["venue_id"] = venue_id
    if year:
        query["year"] = year

    payslips = await db.payslips.find(query).sort("period_end", -1).to_list(length=200)
    for p in payslips:
        p["_id"] = str(p["_id"])
    return payslips


# ==================== EMPLOYEE DOCUMENTS ====================

@router.get("/employee/documents")
async def get_employee_documents(
    employee_id: str = Query(...),
    venue_id: Optional[str] = Query(None),
):
    """Get all document types for an employee: payslips, FS3, contracts, exit docs, skills pass."""
    db = get_database()
    base_query = {"employee_id": employee_id}
    if venue_id:
        base_query["venue_id"] = venue_id

    # Fetch from multiple collections in parallel
    payslips = await db.payslips.find(base_query).sort("period_end", -1).to_list(length=100)
    fs3_statements = await db.fs3_statements.find(base_query).sort("year", -1).to_list(length=50)
    contracts = await db.contracts.find(base_query).sort("start_date", -1).to_list(length=50)
    exit_documents = await db.exit_documents.find(base_query).sort("created_at", -1).to_list(length=50)
    skills_pass = await db.skills_passes.find(base_query).to_list(length=50)

    # Serialize ObjectIds
    for collection in [payslips, fs3_statements, contracts, exit_documents, skills_pass]:
        for doc in collection:
            doc["_id"] = str(doc["_id"])

    return {
        "payslips": payslips,
        "fs3_statements": fs3_statements,
        "contracts": contracts,
        "exit_documents": exit_documents,
        "skills_pass": skills_pass,
    }


# ==================== PERFORMANCE REVIEWS ====================

@router.get("/reviews")
async def list_reviews(
    venue_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """List performance reviews from MongoDB."""
    db = get_database()
    query = {}
    if venue_id:
        query["venue_id"] = venue_id
    if status:
        query["status"] = status

    reviews = await db.performance_reviews.find(query).sort("review_date", -1).to_list(length=200)
    for r in reviews:
        r["_id"] = str(r["_id"])

    # Compute status distribution
    status_counts = {}
    for r in reviews:
        s = r.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    status_data = [{"name": k, "value": v} for k, v in status_counts.items()]

    return {
        "reviews": reviews,
        "statusData": status_data,
        "total": len(reviews),
    }


@router.post("/reviews")
async def create_review(req: Request):
    """Create a new performance review."""
    db = get_database()
    body = await req.json()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    body["status"] = body.get("status", "pending")
    await db.performance_reviews.insert_one(body)
    body.pop("_id", None)
    return body


@router.put("/reviews/{review_id}")
async def update_review(review_id: str, req: Request):
    """Update a performance review."""
    db = get_database()
    body = await req.json()
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.performance_reviews.update_one(
        {"id": review_id},
        {"$set": body}
    )

    if result.modified_count == 0:
        raise HTTPException(404, "Review not found")

    updated = await db.performance_reviews.find_one({"id": review_id})
    if updated:
        updated["_id"] = str(updated["_id"])
    return updated


# ==================== LIVE ATTENDANCE / HR MAP ====================

@router.get("/attendance/live")
async def live_attendance(
    venue_id: Optional[str] = Query(None),
):
    """Get live attendance data for HR Map — markers from clockings + users."""
    db = get_database()
    
    # Get today's clockings
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    query = {"clock_in": {"$gte": today_start.isoformat()}}
    if venue_id:
        query["venue_id"] = venue_id

    clockings = await db.clockings.find(query).to_list(length=500)

    # Build lookup of user details
    user_ids = list(set(c.get("user_id", c.get("employee_id", "")) for c in clockings))
    users_list = await db.users.find({"id": {"$in": user_ids}}).to_list(length=500) if user_ids else []
    users_map = {u.get("id", ""): u for u in users_list}

    markers = []
    checked_in = 0
    checked_out = 0

    for c in clockings:
        uid = c.get("user_id", c.get("employee_id", ""))
        user = users_map.get(uid, {})
        is_in = not c.get("clock_out")

        if is_in:
            checked_in += 1
        else:
            checked_out += 1

        # Use venue coords or default Malta coords
        lat = c.get("lat", user.get("lat", 35.9 + (hash(uid) % 100) * 0.001))
        lng = c.get("lng", user.get("lng", 14.5 + (hash(uid) % 100) * 0.001))

        markers.append({
            "id": str(c.get("_id", "")),
            "name": user.get("name", uid),
            "time": c.get("clock_in", "")[-8:-3] if isinstance(c.get("clock_in", ""), str) else "",
            "loc": c.get("location", user.get("venue_id", "Unknown")),
            "status": "In" if is_in else "Out",
            "coords": [lat, lng],
        })

    total_clockings = await db.clockings.count_documents({}) if hasattr(db.clockings, 'count_documents') else len(clockings)

    return {
        "markers": markers,
        "stats": {
            "total_check_ins": checked_in + checked_out,
            "currently_in": checked_in,
            "mobile_users": len(user_ids),
        }
    }


# ==================== CASH DRAWERS ====================

@router.get("/cash-drawers")
async def list_cash_drawers(venue_id: Optional[str] = Query(None)):
    """Get cash drawers for a venue from MongoDB."""
    db = get_database()
    query = {}
    if venue_id:
        query["venue_id"] = venue_id
    
    drawers = await db.cash_drawers.find(query).to_list(length=100)
    
    if not drawers:
        # Seed default drawers for the venue
        defaults = [
            {"id": "1", "name": "Main Drawer", "venue_id": venue_id or "default"},
            {"id": "2", "name": "Bar Drawer", "venue_id": venue_id or "default"},
        ]
        for d in defaults:
            await db.cash_drawers.insert_one({**d})
        drawers = await db.cash_drawers.find(query).to_list(length=100)
    
    for d in drawers:
        d["_id"] = str(d["_id"])
    return drawers
