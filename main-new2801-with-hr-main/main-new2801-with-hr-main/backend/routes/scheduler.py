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
    
    from mock_data_store import MOCK_EMPLOYEES
    import random
    from datetime import datetime, timedelta

    start_dt = datetime.strptime(week_start, "%Y-%m-%d")
    rows = []
    
    for code, emp in MOCK_EMPLOYEES.items():
        main_role = emp["occupation"].split()[-1]
        if main_role == "HOSTESS": main_role = "HOST"
        display_role = f"(d){main_role}"
        
        row_dict = {
            "employee_name": emp["full_name"],
            "occupation": emp["occupation"],
            "cost_centre": emp["cost_centre"],
            "venue": emp.get("venue", "TBA"),
            "vendor": emp.get("vendor", "Direct"),
            "basic_hrs_overtime": f"{40 * (num_days//7)}h 0m",
            "cost_eur": emp["hourly_rate"] * 40 * (num_days//7)
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
