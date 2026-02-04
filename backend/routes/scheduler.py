"""Scheduler Routes"""
from fastapi import APIRouter, Depends, HTTPException
from models.scheduler import SchedulerWeekData, SchedulerRow, SchedulerCell, SchedulerUpdateRequest
from core.dependencies import get_current_user, get_database
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
    rows = []
    
    # Query DB for employees in this venue
    # Use "GLOBAL" or logic if needed, usually passed in current_user context
    venue_id = current_user.get("venueId")
    query = {"venue_id": venue_id} if venue_id else {}
    
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    
    for emp in employees:
        # Fallback for missing fields in DB
        occ = emp.get("occupation", "Staff")
        main_role = occ.split()[-1] if occ else "Staff"
        if main_role == "HOSTESS": main_role = "HOST"
        display_role = f"(d){main_role}"
        
        row_dict = {
            "employee_name": emp.get("full_name", "Unknown"),
            "occupation": occ,
            "cost_centre": emp.get("cost_centre", "General"),
            "venue": venue_id or "General", # or fetch venue name
            "vendor": emp.get("vendor", "Direct"),
            "basic_hrs_overtime": f"{40 * (num_days//7)}h 0m",
            # Mock rate if missing
            "cost_eur": 10.0 * 40 * (num_days//7) 
        }
        
        # Populate dynamic date keys
        for day_idx in range(num_days):
            current_day = start_dt + timedelta(days=day_idx)
            date_key = current_day.strftime("%Y-%m-%d")
            
            # Simple logic for mock data
            if current_day.weekday() in [2, 6]: # Wed and Sun off
                cell = SchedulerCell(cell_type="OFF_DAY", background_color="pink")
            else:
                # Vary shifts slightly by day of week
                st = "09:00"
                et = "17:00"
                if current_day.weekday() >= 4: # Fri/Sat late
                    st = "17:00"
                    et = "01:00"
                
                cell = SchedulerCell(
                    cell_type="WORK_SHIFT", 
                    role=display_role, 
                    start_time=st, 
                    end_time=et, 
                    background_color="blue"
                )
            
            row_dict[date_key] = cell
            
        row = SchedulerRow(**row_dict)
        rows.append(row)
    
    return SchedulerWeekData(
        week_start=week_start,
        week_end=(start_dt + timedelta(days=num_days-1)).strftime("%Y-%m-%d"),
        rows=rows
    )


@router.put("/update-cell")
async def update_scheduler_cell(
    request: SchedulerUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update a scheduler cell"""
    # Mock update
    return {"success": True, "message": "Cell updated successfully"}
