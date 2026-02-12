"""Scheduler Routes — reads real shift data from DB"""
from fastapi import APIRouter, Depends, HTTPException
from models.scheduler import SchedulerWeekData, SchedulerRow, SchedulerCell, SchedulerUpdateRequest
from core.dependencies import get_current_user, get_database
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


@router.get("/data", response_model=SchedulerWeekData)
async def get_scheduler_data(
    week_start: str,  # "2026-01-26"
    num_days: int = 7,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get scheduler data for a specific range (7 or 28 days)"""

    start_dt = datetime.strptime(week_start, "%Y-%m-%d")
    end_dt = start_dt + timedelta(days=num_days)
    venue_id = current_user.get("venue_id") or current_user.get("venueId")
    allowed_venue_ids = current_user.get("allowed_venue_ids", [venue_id] if venue_id else [])

    # ── 1. Fetch employees for this venue (or all allowed venues) ──────
    if allowed_venue_ids:
        emp_query = {"venue_id": {"$in": allowed_venue_ids}, "status": "active"}
    elif venue_id:
        emp_query = {"venue_id": venue_id, "status": "active"}
    else:
        emp_query = {"status": "active"}
    employees = await db.employees.find(emp_query, {"_id": 0}).to_list(1000)

    if not employees:
        # Fallback: also try without status filter
        emp_query_fb = {"venue_id": {"$in": allowed_venue_ids}} if allowed_venue_ids else {}
        employees = await db.employees.find(emp_query_fb, {"_id": 0}).to_list(1000)

    # ── 2. Build shift lookup: emp_id -> {date_str: shift_doc} ───────────
    if allowed_venue_ids:
        shift_query = {
            "venue_id": {"$in": allowed_venue_ids},
            "date": {
                "$gte": start_dt.strftime("%Y-%m-%d"),
                "$lt": end_dt.strftime("%Y-%m-%d"),
            }
        }
    elif venue_id:
        shift_query = {
            "venue_id": venue_id,
            "date": {
                "$gte": start_dt.strftime("%Y-%m-%d"),
                "$lt": end_dt.strftime("%Y-%m-%d"),
            }
        }
    else:
        shift_query = {
            "date": {
                "$gte": start_dt.strftime("%Y-%m-%d"),
                "$lt": end_dt.strftime("%Y-%m-%d"),
            }
        }
    shifts_cursor = db.shifts.find(shift_query, {"_id": 0})
    all_shifts = await shifts_cursor.to_list(5000)

    shift_map: dict = {}  # {employee_id: {date: shift}}
    for s in all_shifts:
        eid = s.get("employee_id", "")
        d = s.get("date", "")
        if eid not in shift_map:
            shift_map[eid] = {}
        shift_map[eid][d] = s

    # ── 3. Build rows ────────────────────────────────────────────────────
    rows = []
    for emp in employees:
        emp_id = emp.get("id", "")
        occ = emp.get("occupation", "Staff")
        main_role = occ.split()[-1] if occ else "Staff"
        if main_role == "HOSTESS":
            main_role = "HOST"
        display_role = f"(d){main_role}"

        emp_shifts = shift_map.get(emp_id, {})
        total_hours = 0.0
        total_cost = 0.0
        hourly_rate = emp.get("hourly_rate", 10.0)

        row_dict = {
            "employee_name": emp.get("full_name", emp.get("name", "Unknown")),
            "occupation": occ,
            "cost_centre": emp.get("cost_centre", "General"),
            "venue": venue_id or "General",
            "vendor": emp.get("vendor", "Direct"),
        }

        # Populate dynamic date keys
        for day_idx in range(num_days):
            current_day = start_dt + timedelta(days=day_idx)
            date_key = current_day.strftime("%Y-%m-%d")

            shift = emp_shifts.get(date_key)

            if shift:
                # Real shift from DB
                st_raw = shift.get("start_time", "09:00")
                et_raw = shift.get("end_time", "17:00")
                # Extract HH:MM if ISO format
                st = st_raw[11:16] if "T" in st_raw else st_raw
                et = et_raw[11:16] if "T" in et_raw else et_raw
                hours = shift.get("hours_planned", 8.0)
                total_hours += hours
                total_cost += hours * hourly_rate
                label = shift.get("shift_label", "")
                status = shift.get("status", "scheduled")

                bg = "blue"
                if status == "completed":
                    bg = "green"
                elif label == "Night" or label == "Evening":
                    bg = "purple"

                cell = SchedulerCell(
                    cell_type="WORK_SHIFT",
                    role=display_role,
                    start_time=st,
                    end_time=et,
                    background_color=bg,
                )
            else:
                # No shift = off day
                cell = SchedulerCell(cell_type="OFF_DAY", background_color="pink")

            row_dict[date_key] = cell

        hrs = int(total_hours)
        mins = int((total_hours - hrs) * 60)
        row_dict["basic_hrs_overtime"] = f"{hrs}h {mins}m"
        row_dict["cost_eur"] = round(total_cost, 2)

        row = SchedulerRow(**row_dict)
        rows.append(row)

    return SchedulerWeekData(
        week_start=week_start,
        week_end=(start_dt + timedelta(days=num_days - 1)).strftime("%Y-%m-%d"),
        rows=rows,
    )


@router.put("/update-cell")
async def update_scheduler_cell(
    request: SchedulerUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a scheduler cell — persists to shifts collection"""
    import uuid as _uuid
    venue_id = current_user.get("venueId")
    cell = request.cell_data

    # Find the employee row
    emp_row = await db.employees.find_one({"id": request.row_id, "venue_id": venue_id}, {"_id": 0})
    if not emp_row:
        # Try by row_id as a SchedulerRow uuid (fallback)
        emp_row = await db.employees.find_one({"venue_id": venue_id}, {"_id": 0})

    if emp_row and cell.cell_type == "WORK_SHIFT":
        shift_doc = {
            "id": str(_uuid.uuid4()),
            "venue_id": venue_id,
            "employee_id": emp_row.get("id"),
            "employee_name": emp_row.get("full_name"),
            "date": request.day,
            "start_time": cell.start_time or "09:00",
            "end_time": cell.end_time or "17:00",
            "status": "scheduled",
            "created_at": datetime.utcnow().isoformat(),
        }
        await db.shifts.update_one(
            {"employee_id": emp_row.get("id"), "date": request.day, "venue_id": venue_id},
            {"$set": shift_doc},
            upsert=True,
        )
    elif emp_row and cell.cell_type == "OFF_DAY":
        # Remove any scheduled shift for this day
        await db.shifts.delete_one(
            {"employee_id": emp_row.get("id"), "date": request.day, "venue_id": venue_id}
        )

    return {"success": True, "message": "Cell updated successfully"}
