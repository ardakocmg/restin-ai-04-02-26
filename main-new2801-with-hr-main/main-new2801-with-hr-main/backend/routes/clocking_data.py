"""Clocking Data Routes"""
from fastapi import APIRouter, Depends
from models.clocking_data import ClockingRecord, ClockingDataRequest
from core.dependencies import get_current_user, get_database
from typing import List
from datetime import datetime

router = APIRouter(prefix="/clocking", tags=["Clocking Data"])


@router.post("/data", response_model=List[ClockingRecord])
async def get_clocking_data(
    request: ClockingDataRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get clocking data for date range"""
    venue_id = current_user.get("venue_id")
    
    # Mock data - Derived from Synchronized Store
    from mock_data_store import MOCK_CLOCKING
    
    records = []
    
    for clk in MOCK_CLOCKING:
        records.append(
             ClockingRecord(
                id=clk["id"],
                venue_id=venue_id,
                day_of_week=datetime.strptime(clk["date"], "%d/%m/%Y").strftime("%A"),
                date=clk["date"],
                clocking_in=clk["clock_in"],
                clocking_out=clk["clock_out"],
                employee_name=clk["employee_name"],
                employee_designation=clk.get("designation", "Staff"), # Use actual designation or default
                cost_centre=clk.get("vendor", clk["venue"]), # Use Vendor as Cost Centre
                modified_by="System",
                created_by="Term_01",
                remark=clk["remarks"]
            )
        )
    
    # Filter by search query if provided
    if request.search_query:
        records = [
            r for r in records
            if request.search_query.lower() in r.employee_name.lower()
        ]
    
    return records
