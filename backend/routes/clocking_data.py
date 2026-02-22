import logging
logger = logging.getLogger(__name__)

"""Clocking Data Routes"""
from fastapi import APIRouter, Depends, HTTPException, Request
from models.clocking_data import ClockingRecord, ClockingDataRequest
from core.dependencies import get_current_user, get_database
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import uuid

MALTA_TZ = ZoneInfo("Europe/Malta")

router = APIRouter(prefix="/clocking", tags=["Clocking Data"])


# ── Request / Response Models ────────────────────────────
class ClockInRequest(BaseModel):
    employee_id: Optional[str] = None  # Managers can clock in on behalf
    work_area: Optional[str] = None
    cost_centre: Optional[str] = None
    remark: Optional[str] = None
    device_name: Optional[str] = None
    # Device & Location tracking
    device_info: Optional[Dict[str, Any]] = None  # Browser, OS, platform, UA, screen
    geolocation: Optional[Dict[str, Any]] = None   # lat, lng, accuracy
    ip_address: Optional[str] = None  # Forwarded from frontend if available


class ClockOutRequest(BaseModel):
    record_id: Optional[str] = None  # Specific record to close
    employee_id: Optional[str] = None  # Or find active by employee
    remark: Optional[str] = None
    geolocation: Optional[Dict[str, Any]] = None  # Location at clock-out


class WorkArea(BaseModel):
    id: str
    name: str
    code: str


# ── POST /clocking/data — Existing: Get clocking data for range ──
@router.post("/data", response_model=List[ClockingRecord])
async def get_clocking_data(
    request: ClockingDataRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get clocking data for date range"""
    venue_id = current_user.get("venue_id") or current_user.get("venueId") or "GLOBAL"

    query = {}
    if venue_id != "GLOBAL":
        # Support multi-venue: show all clocking from user's allowed venues
        allowed_venues = current_user.get("allowed_venue_ids", [venue_id])
        if allowed_venues:
            # Always include GLOBAL for legacy/shared records
            venue_filter = list(set(allowed_venues + ["GLOBAL"]))
            query["venue_id"] = {"$in": venue_filter}
        else:
            query["venue_id"] = {"$in": [venue_id, "GLOBAL"]}

    # Apply search filter at DB level if possible
    if request.search_query:
        query["employee_name"] = {"$regex": request.search_query, "$options": "i"}

    cursor = db["clocking_records"].find(query, {"_id": 0}).sort("date", -1).limit(2000)
    records = [ClockingRecord(**doc) async for doc in cursor]

    return records


# ── POST /clocking/clock-in — Start a new clocking session ──
@router.post("/clock-in")
async def clock_in(
    request: ClockInRequest,
    raw_request: Request,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Clock in — creates a new active clocking record (or approval request)"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_id = current_user.get("userId") or current_user.get("id") or ""
    user_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    # Determine which employee is clocking in
    target_emp_id = request.employee_id or user_id
    target_emp_name = user_name

    # If clocking on behalf of someone, look up their name
    if request.employee_id and request.employee_id != user_id:
        emp_doc = await db.employees.find_one({"id": request.employee_id})
        if emp_doc:
            target_emp_name = emp_doc.get("full_name") or emp_doc.get("name") or "Unknown"
        else:
            raise HTTPException(status_code=404, detail="Employee not found")

    # Check for existing active session
    active = await db["clocking_records"].find_one({
        "employee_id": target_emp_id,
        "status": "active",
        "venue_id": venue_id
    })
    if active:
        raise HTTPException(status_code=409, detail="Employee already clocked in")

    # ── CHECK APPROVAL SETTINGS ──────────────────────────────────────────
    needs_approval = False
    approval_reason = ""

    venue_cfg = await db.venue_configs.find_one({"venue_id": venue_id})
    approval_rules = {}
    if venue_cfg:
        rules = venue_cfg.get("rules", {})
        approval_rules = rules.get("approval", {}).get("manual_clocking", {})
    else:
        # Use defaults from venue_config module
        try:
            from core.venue_config import DEFAULTS
            approval_rules = DEFAULTS.get("rules", {}).get("approval", {}).get("manual_clocking", {})
        except Exception as e:  # noqa
            approval_rules = {}

    # Check if staff app requires approval
    if approval_rules.get("staff_app_requires_approval", True):
        needs_approval = True
        approval_reason = "Staff app manual clocking requires approval"

    # Check auto-approve override
    if approval_rules.get("auto_approve_enabled", False):
        needs_approval = False

    # Check shift mismatch
    if approval_rules.get("shift_mismatch_triggers_approval", True):
        now_utc = datetime.now(timezone.utc)
        now_malta = now_utc.astimezone(MALTA_TZ)
        today_str = now_malta.strftime("%Y-%m-%d")
        tolerance = approval_rules.get("shift_mismatch_tolerance_minutes", 15)

        scheduled_shift = await db.shifts.find_one({
            "employee_id": target_emp_id,
            "date": today_str,
            "venue_id": venue_id
        })

        if scheduled_shift:
            shift_start_str = scheduled_shift.get("start_time", "")
            if "T" in shift_start_str:
                shift_start_str = shift_start_str[11:16]
            try:
                shift_start_dt = datetime.strptime(f"{today_str} {shift_start_str}", "%Y-%m-%d %H:%M")
                clock_in_dt = datetime.strptime(f"{today_str} {now_malta.strftime('%H:%M')}", "%Y-%m-%d %H:%M")
                diff_mins = abs((clock_in_dt - shift_start_dt).total_seconds() / 60)
                if diff_mins > tolerance:
                    needs_approval = True
                    approval_reason = f"Shift mismatch: clocking at {now_malta.strftime('%H:%M')}, shift starts at {shift_start_str} ({int(diff_mins)}min diff)"
            except Exception as e:
                logger.warning(f"Silenced error: {e}")
                pass
        elif not scheduled_shift:
            needs_approval = True
            approval_reason = "No scheduled shift found for today"

    # ── IF APPROVAL NEEDED → CREATE REQUEST ──────────────────────────────
    if needs_approval:
        now_utc = datetime.now(timezone.utc)
        now_malta = now_utc.astimezone(MALTA_TZ)
        approval_id = str(uuid.uuid4())
        approval_doc = {
            "id": approval_id,
            "venue_id": venue_id,
            "type": "manual_clocking",
            "source": "staff_app",
            "employee_id": target_emp_id,
            "employee_name": target_emp_name,
            "requested_by": user_id,
            "requested_by_name": user_name,
            "reason": approval_reason,
            "details": {
                "date": now_malta.strftime("%d/%m/%Y"),
                "time": now_malta.strftime("%H:%M"),
                "cost_centre": request.cost_centre or request.work_area or "N/A",
                "work_area": request.work_area,
                "remark": request.remark,
                "device_name": request.device_name,
            },
            "status": "pending",
            "created_at": now_utc.isoformat(),
        }
        await db.approval_requests.insert_one(approval_doc)
        return {
            "success": True,
            "requires_approval": True,
            "approval_id": approval_id,
            "message": f"Clock-in sent for approval: {approval_reason}",
            "status": "pending_approval",
        }

    # ── DIRECT CLOCK-IN (no approval needed) ─────────────────────────────
    # Capture client IP — prefer X-Forwarded-For (reverse proxy), else direct
    client_ip = request.ip_address
    if not client_ip:
        forwarded = raw_request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif raw_request.client:
            client_ip = raw_request.client.host

    now_utc = datetime.now(timezone.utc)
    now_malta = now_utc.astimezone(MALTA_TZ)
    record = ClockingRecord(
        id=str(uuid.uuid4()),
        venue_id=venue_id,
        employee_id=target_emp_id,
        day_of_week=now_malta.strftime("%A"),
        date=now_malta.strftime("%d/%m/%Y"),
        clocking_in=now_malta.strftime("%H:%M"),
        clocking_out=None,
        hours_worked=0.0,
        status="active",
        employee_name=target_emp_name,
        cost_centre=request.cost_centre or request.work_area or "N/A",
        work_area=request.work_area,
        source_device="web_manual",
        device_name=request.device_name or "Web Browser",
        ip_address=client_ip,
        device_info=request.device_info,
        geolocation=request.geolocation,
        modified_by=user_name,
        created_by=user_name,
        remark=request.remark
    )

    await db["clocking_records"].insert_one(record.model_dump(by_alias=True))

    return {"success": True, "record_id": record.id, "clocked_in_at": record.clocking_in, "status": "active"}


# ── POST /clocking/clock-out — End an active clocking session ──
@router.post("/clock-out")
async def clock_out(
    request: ClockOutRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Clock out — find and close active record, calculate hours"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_id = current_user.get("userId") or current_user.get("id") or ""
    user_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    target_emp_id = request.employee_id or user_id

    # Find active record
    query = {"status": "active", "venue_id": venue_id}
    if request.record_id:
        query["id"] = request.record_id
    else:
        query["employee_id"] = target_emp_id

    active = await db["clocking_records"].find_one(query)
    if not active:
        raise HTTPException(status_code=404, detail="No active clocking session found")

    now_utc = datetime.now(timezone.utc)
    now_malta = now_utc.astimezone(MALTA_TZ)
    clock_out_time = now_malta.strftime("%H:%M")

    # Calculate hours worked
    try:
        cin = datetime.strptime(active["clocking_in"], "%H:%M")
        cout = datetime.strptime(clock_out_time, "%H:%M")
        diff_minutes = (cout - cin).total_seconds() / 60
        if diff_minutes < 0:
            diff_minutes += 1440  # Overnight shift
        hours_worked = round(diff_minutes / 60, 2)
    except (ValueError, KeyError):
        hours_worked = 0.0

    update_set = {
        "clocking_out": clock_out_time,
        "hours_worked": hours_worked,
        "status": "completed",
        "modified_by": user_name,
        "remark": request.remark or active.get("remark")
    }
    if request.geolocation:
        update_set["clock_out_geolocation"] = request.geolocation

    await db["clocking_records"].update_one(
        {"id": active["id"]},
        {"$set": update_set}
    )

    return {
        "success": True,
        "record_id": active["id"],
        "clocked_out_at": clock_out_time,
        "hours_worked": hours_worked,
        "status": "completed"
    }


# ── GET /clocking/active — Currently clocked-in employees ──
@router.get("/active")
async def get_active_sessions(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all currently active (clocked in) sessions"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    query = {"status": "active"}
    if venue_id != "GLOBAL":
        query["venue_id"] = venue_id

    cursor = db["clocking_records"].find(query)
    records = []
    async for doc in cursor:
        records.append({
            "id": doc.get("id"),
            "employee_id": doc.get("employee_id"),
            "employee_name": doc.get("employee_name"),
            "clocking_in": doc.get("clocking_in"),
            "date": doc.get("date"),
            "work_area": doc.get("work_area"),
            "cost_centre": doc.get("cost_centre"),
            "source_device": doc.get("source_device"),
            "device_name": doc.get("device_name"),
            "ip_address": doc.get("ip_address"),
            "device_info": doc.get("device_info"),
            "geolocation": doc.get("geolocation"),
        })

    return records


# ── GET /clocking/my-status — Am I clocked in? ──
@router.get("/my-status")
async def my_clocking_status(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Check current user's clocking status"""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_id = current_user.get("userId") or current_user.get("id") or ""

    active = await db["clocking_records"].find_one({
        "employee_id": user_id,
        "status": "active",
        "venue_id": venue_id
    })

    if active:
        return {
            "clocked_in": True,
            "record_id": active.get("id"),
            "clocking_in": active.get("clocking_in"),
            "date": active.get("date"),
            "work_area": active.get("work_area"),
            "cost_centre": active.get("cost_centre"),
        }

    # Last completed session
    last = await db["clocking_records"].find_one(
        {"employee_id": user_id, "status": "completed", "venue_id": venue_id},
        sort=[("created_at", -1)]
    )

    return {
        "clocked_in": False,
        "last_session": {
            "date": last.get("date"),
            "clocking_in": last.get("clocking_in"),
            "clocking_out": last.get("clocking_out"),
            "hours_worked": last.get("hours_worked"),
        } if last else None
    }


# ── GET /clocking/work-areas — Available work areas ──
@router.get("/work-areas")
async def get_work_areas(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get available work areas / cost centres for the venue"""
    venue_id = current_user.get("venueId") or "GLOBAL"

    # Pull distinct cost centres from existing records
    pipeline = [
        {"$match": {"venue_id": venue_id} if venue_id != "GLOBAL" else {}},
        {"$group": {"_id": "$cost_centre"}},
        {"$sort": {"_id": 1}}
    ]
    cursor = db["clocking_records"].aggregate(pipeline)
    areas = []
    async for doc in cursor:
        code = doc["_id"]
        if code and code != "N/A":
            areas.append({"id": code, "name": code, "code": code})

    # Add common defaults if empty
    if not areas:
        defaults = [
            {"id": "FOH", "name": "Front of House", "code": "FOH"},
            {"id": "BOH", "name": "Back of House", "code": "BOH"},
            {"id": "BAR", "name": "Bar", "code": "BAR"},
            {"id": "KITCHEN", "name": "Kitchen", "code": "KITCHEN"},
            {"id": "ADMIN", "name": "Administration", "code": "ADMIN"},
        ]
        areas = defaults

    return areas


# ── Request model for manual clock entry ──────────────────────
class AddClockEntryRequest(BaseModel):
    employee_id: Optional[str] = None          # If HR is adding on behalf
    date: str                                   # YYYY-MM-DD
    clock_in: str                               # HH:MM
    clock_out: str                              # HH:MM
    work_area: Optional[str] = None
    cost_centre: Optional[str] = None
    reason: Optional[str] = None                # Why manual entry is needed
    device_info: Optional[Dict[str, Any]] = None


# ── POST /clocking/add-entry — Add a completed clock entry (past date) ──
@router.post("/add-entry")
async def add_clock_entry(
    request: AddClockEntryRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Add a manual clock entry for a past date. Routes through approval for staff."""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_id = current_user.get("userId") or current_user.get("id") or ""
    user_name = current_user.get("fullName") or current_user.get("name") or "Unknown"
    user_role = (current_user.get("role") or "").upper()

    # Determine target employee
    target_emp_id = request.employee_id or user_id
    target_emp_name = user_name
    is_on_behalf = request.employee_id and request.employee_id != user_id

    if is_on_behalf:
        emp_doc = await db.employees.find_one({"id": request.employee_id})
        if emp_doc:
            target_emp_name = emp_doc.get("full_name") or emp_doc.get("name") or "Unknown"
        else:
            raise HTTPException(status_code=404, detail="Employee not found")

    # ── Validate inputs ──────────────────────────────────────────
    try:
        entry_date = datetime.strptime(request.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    now_malta = datetime.now(timezone.utc).astimezone(MALTA_TZ)
    if entry_date.date() > now_malta.date():
        raise HTTPException(status_code=400, detail="Cannot add clock entry for a future date")

    try:
        ci_h, ci_m = map(int, request.clock_in.split(":"))
        co_h, co_m = map(int, request.clock_out.split(":"))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

    clock_in_mins = ci_h * 60 + ci_m
    clock_out_mins = co_h * 60 + co_m
    if clock_out_mins <= clock_in_mins:
        raise HTTPException(status_code=400, detail="Clock out must be after clock in")

    hours_worked = round((clock_out_mins - clock_in_mins) / 60, 2)

    # Check for overlapping entries on same date
    existing = await db["clocking_records"].find_one({
        "employee_id": target_emp_id,
        "venue_id": venue_id,
        "date": entry_date.strftime("%d/%m/%Y"),
        "status": {"$ne": "deleted"},
        "$or": [
            {"clocking_in": {"$lte": request.clock_out}, "clocking_out": {"$gte": request.clock_in}},
        ]
    })
    if existing:
        raise HTTPException(status_code=409, detail="Overlapping clock entry exists for this date/time")

    # Format date for display
    day_of_week = entry_date.strftime("%A")
    display_date = entry_date.strftime("%d/%m/%Y")

    # ── Determine approval requirement ─────────────────────────
    needs_approval = True  # Default: require approval
    approval_reason = request.reason or "Manual clock entry"

    if user_role in ("OWNER", "MANAGER", "PRODUCT_OWNER"):
        # Check venue approval settings
        venue_cfg = await db.venue_configs.find_one({"venue_id": venue_id})
        approval_rules = {}
        if venue_cfg:
            rules = venue_cfg.get("rules", {})
            approval_rules = rules.get("approval", {}).get("manual_clocking", {})

        if approval_rules.get("auto_approve_enabled", False):
            needs_approval = False
        elif not is_on_behalf:
            # Manager adding their own entry — still needs approval by default
            needs_approval = True
        else:
            # Manager adding on behalf — check config
            if not approval_rules.get("staff_app_requires_approval", True):
                needs_approval = False

    # ── Build the record payload ─────────────────────────────────
    record_id = str(uuid.uuid4())
    record_payload = {
        "id": record_id,
        "venue_id": venue_id,
        "employee_id": target_emp_id,
        "employee_name": target_emp_name,
        "day_of_week": day_of_week,
        "date": display_date,
        "clocking_in": request.clock_in,
        "clocking_out": request.clock_out,
        "hours_worked": hours_worked,
        "status": "completed",
        "cost_centre": request.cost_centre or request.work_area or "N/A",
        "work_area": request.work_area,
        "source_device": "manual_entry",
        "device_name": "Manual Entry",
        "device_info": request.device_info,
        "modified_by": user_name,
        "created_by": user_name,
        "remark": request.reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # ── Route: approval or direct insert ─────────────────────────
    if needs_approval:
        approval_id = str(uuid.uuid4())
        approval_doc = {
            "id": approval_id,
            "venue_id": venue_id,
            "type": "manual_clock_entry",
            "source": "manual_entry",
            "employee_id": target_emp_id,
            "employee_name": target_emp_name,
            "requested_by": user_id,
            "requested_by_name": user_name,
            "reason": approval_reason,
            "details": {
                "date": display_date,
                "day_of_week": day_of_week,
                "clock_in": request.clock_in,
                "clock_out": request.clock_out,
                "hours_worked": hours_worked,
                "work_area": request.work_area or "N/A",
                "cost_centre": request.cost_centre or "N/A",
                "reason": request.reason,
            },
            "payload": record_payload,  # Full record to insert on approval
            "status": "pending",
            "priority": "normal",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.approval_requests.insert_one(approval_doc)
        return {
            "success": True,
            "requires_approval": True,
            "approval_id": approval_id,
            "message": f"Clock entry for {display_date} sent for approval",
            "status": "pending_approval",
        }
    else:
        # Direct insert — no approval needed
        await db["clocking_records"].insert_one(record_payload)
        return {
            "success": True,
            "requires_approval": False,
            "record_id": record_id,
            "message": f"Clock entry added for {display_date}: {request.clock_in} - {request.clock_out} ({hours_worked}h)",
            "status": "completed",
        }


# ── GET /clocking/exceptions — Attendance exceptions (late, early, missed) ──
@router.get("/exceptions")
async def get_attendance_exceptions(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Detect attendance exceptions: late arrivals, early departures, missed clockings, overtime."""
    venue_id = current_user.get("venueId") or "GLOBAL"

    # Get all shifts in range
    shift_query = {"venue_id": venue_id}
    if date_from:
        shift_query["date"] = {"$gte": date_from}
    if date_to:
        shift_query.setdefault("date", {})
        if isinstance(shift_query["date"], dict):
            shift_query["date"]["$lte"] = date_to
        else:
            shift_query["date"] = {"$gte": date_from, "$lte": date_to}

    shifts = await db.shifts.find(shift_query, {"_id": 0}).to_list(5000)

    # Build lookup: employee_id + date → shift
    shift_map = {}
    for s in shifts:
        key = f"{s.get('employee_id')}|{s.get('date')}"
        shift_map[key] = s

    # Get all clocking records in range
    clock_query = {"venue_id": venue_id, "status": {"$in": ["completed", "active"]}}
    clockings = await db["clocking_records"].find(clock_query, {"_id": 0}).to_list(5000)

    # Build lookup: employee_id + date → clocking
    clock_map = {}
    for c in clockings:
        # Convert dd/mm/yyyy to yyyy-mm-dd for matching
        date_raw = c.get("date", "")
        if "/" in date_raw:
            parts = date_raw.split("/")
            if len(parts) == 3:
                date_raw = f"{parts[2]}-{parts[1]}-{parts[0]}"
        key = f"{c.get('employee_id')}|{date_raw}"
        clock_map[key] = c

    exceptions = []
    tolerance_minutes = 15

    # Check each shift for exceptions
    for key, shift in shift_map.items():
        emp_id, date_str = key.split("|", 1)
        clocking = clock_map.get(key)

        shift_start = shift.get("start_time", "09:00")
        if "T" in shift_start:
            shift_start = shift_start[11:16]
        shift_end = shift.get("end_time", "17:00")
        if "T" in shift_end:
            shift_end = shift_end[11:16]

        emp_name = shift.get("employee_name", "Unknown")

        if not clocking:
            # Missed clocking — no record at all
            exceptions.append({
                "type": "missed_clocking",
                "severity": "critical",
                "employee_id": emp_id,
                "employee_name": emp_name,
                "date": date_str,
                "expected_start": shift_start,
                "expected_end": shift_end,
                "message": f"No clocking record found for scheduled shift"
            })
            continue

        clock_in = clocking.get("clocking_in", "")
        clock_out = clocking.get("clocking_out", "")

        # Late arrival check
        if clock_in and shift_start:
            try:
                ci_mins = int(clock_in.split(":")[0]) * 60 + int(clock_in.split(":")[1])
                ss_mins = int(shift_start.split(":")[0]) * 60 + int(shift_start.split(":")[1])
                if ci_mins > ss_mins + tolerance_minutes:
                    exceptions.append({
                        "type": "late_arrival",
                        "severity": "warning",
                        "employee_id": emp_id,
                        "employee_name": emp_name,
                        "date": date_str,
                        "expected": shift_start,
                        "actual": clock_in,
                        "diff_minutes": ci_mins - ss_mins,
                        "message": f"Arrived {ci_mins - ss_mins} minutes late"
                    })
            except (ValueError, IndexError):
                pass

        # Early departure check
        if clock_out and shift_end:
            try:
                co_mins = int(clock_out.split(":")[0]) * 60 + int(clock_out.split(":")[1])
                se_mins = int(shift_end.split(":")[0]) * 60 + int(shift_end.split(":")[1])
                if co_mins < se_mins - tolerance_minutes:
                    exceptions.append({
                        "type": "early_departure",
                        "severity": "warning",
                        "employee_id": emp_id,
                        "employee_name": emp_name,
                        "date": date_str,
                        "expected": shift_end,
                        "actual": clock_out,
                        "diff_minutes": se_mins - co_mins,
                        "message": f"Left {se_mins - co_mins} minutes early"
                    })
            except (ValueError, IndexError):
                pass

        # Overtime check
        hours = clocking.get("hours_worked", 0)
        if hours > 10:
            exceptions.append({
                "type": "overtime",
                "severity": "info",
                "employee_id": emp_id,
                "employee_name": emp_name,
                "date": date_str,
                "hours_worked": hours,
                "message": f"Worked {hours} hours (potential overtime)"
            })

    return {
        "total_exceptions": len(exceptions),
        "exceptions": sorted(exceptions, key=lambda x: (x.get("date", ""), x.get("severity", "")))
    }


# ── POST /clocking/import — Bulk import clocking data from CSV/JSON ──
class ClockingImportItem(BaseModel):
    employee_id: str
    employee_name: str = ""
    date: str  # YYYY-MM-DD
    clock_in: str  # HH:MM
    clock_out: str  # HH:MM
    work_area: Optional[str] = None
    cost_centre: Optional[str] = None

class ClockingImportRequest(BaseModel):
    records: List[ClockingImportItem]
    source: str = "csv_import"


@router.post("/import")
async def import_clocking_data(
    request: ClockingImportRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Bulk import clocking data from external sources (CSV/JSON)."""
    venue_id = current_user.get("venueId") or "GLOBAL"
    user_name = current_user.get("fullName") or current_user.get("name") or "Unknown"

    imported = 0
    errors = []

    for item in request.records:
        try:
            entry_date = datetime.strptime(item.date, "%Y-%m-%d")
            ci_h, ci_m = map(int, item.clock_in.split(":"))
            co_h, co_m = map(int, item.clock_out.split(":"))

            clock_in_mins = ci_h * 60 + ci_m
            clock_out_mins = co_h * 60 + co_m
            hours_worked = round((clock_out_mins - clock_in_mins) / 60, 2) if clock_out_mins > clock_in_mins else 0

            record = {
                "id": str(uuid.uuid4()),
                "venue_id": venue_id,
                "employee_id": item.employee_id,
                "employee_name": item.employee_name,
                "day_of_week": entry_date.strftime("%A"),
                "date": entry_date.strftime("%d/%m/%Y"),
                "clocking_in": item.clock_in,
                "clocking_out": item.clock_out,
                "hours_worked": hours_worked,
                "status": "completed",
                "cost_centre": item.cost_centre or item.work_area or "N/A",
                "work_area": item.work_area,
                "source_device": request.source,
                "device_name": f"Import ({request.source})",
                "modified_by": user_name,
                "created_by": user_name,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db["clocking_records"].insert_one(record)
            imported += 1
        except Exception as e:
            errors.append({"employee_id": item.employee_id, "date": item.date, "error": str(e)})

    return {
        "success": True,
        "imported": imported,
        "errors": errors,
        "total_submitted": len(request.records)
    }

