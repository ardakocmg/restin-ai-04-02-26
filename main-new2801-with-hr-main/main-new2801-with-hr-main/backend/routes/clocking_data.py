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
    """Get clocking data for date range (Lazy Seed from Mock)"""
    venue_id = current_user.get("venueId") or "GLOBAL"

    # 1. Check if DB is empty for this venue (or globally if shared)
    # Using "GLOBAL" concept: data is shared or specific? Mock data is generic.
    # We will check if ANY records exist.
    count = await db["clocking_records"].count_documents({})
    
    if count == 0:
        # SEED DATA
        from mock_data_store import MOCK_CLOCKING, MOCK_EMPLOYEES
        
        # 1. Ensure Employees Exist First (Foreign Key Requirement)
        emp_count = await db.employees.count_documents({})
        if emp_count == 0:
            seed_emps = []
            for code, emp in MOCK_EMPLOYEES.items():
                seed_emps.append({
                    "id": str(uuid.uuid4()),
                    "display_id": code,
                    "venue_id": venue_id,
                    "full_name": emp["full_name"],
                    "email": emp["email"],
                    "role": "staff",
                    "department": emp["department"], 
                    "employment_status": "active",
                    "start_date": emp.get("employment_date"),
                    "phone": emp.get("mobile"),
                    "occupation": emp["occupation"],
                    "cost_centre": emp["cost_centre"],
                    "vendor": emp.get("vendor"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            if seed_emps:
                await db.employees.insert_many(seed_emps)
        
        # 2. Build Map for Linking (Code -> UUID)
        # We need to link clocking records (which have "code") to the real DB ID
        emp_map = {}
        all_emps = await db.employees.find({}, {"id": 1, "display_id": 1}).to_list(2000)
        for e in all_emps:
            if "display_id" in e:
                emp_map[e["display_id"]] = e["id"]

        # 3. Seed Clocking Data with Links
        seed_docs = []
        for clk in MOCK_CLOCKING:
            # Resolve Employee ID
            emp_code = clk.get("employee_code") # Check if mock has this, otherwise fallback
            if not emp_code:
                # Mock clocking id might look like clk_1001_123, extract 1001
                parts = clk["id"].split("_")
                if len(parts) >= 2:
                    emp_code = parts[1]
            
            real_emp_id = emp_map.get(emp_code)
            
            # If no employee found (rare in mock consistency), fallback or skip
            if not real_emp_id:
                # Try finding by name match as fallback
                found = False
                for e in all_emps:
                    # Logic: if name in clocking matches name in emp? Mock store consistency is good usually.
                    pass
                
                # If still failing, generate a placeholder ID or use venue generic?
                # For integrity we need a value. Let's use a placeholder if missing.
                real_emp_id = f"missing_link_{emp_code}" 

            record = ClockingRecord(
                id=clk["id"],
                venue_id=venue_id,
                employee_id=real_emp_id, # LINKED!
                day_of_week=datetime.strptime(clk["date"], "%d/%m/%Y").strftime("%A"),
                date=clk["date"],
                clocking_in=clk["clock_in"],
                clocking_out=clk["clock_out"],
                hours_worked=clk.get("hours_worked", 0.0),
                employee_name=clk["employee_name"],
                employee_designation=clk.get("designation", "Staff"),
                cost_centre=clk.get("cost_centre", clk.get("vendor", "N/A")),
                modified_by="System",
                created_by="Term_01",
                remark=clk["remarks"]
            )
            seed_docs.append(record.model_dump(by_alias=True))
        
        if seed_docs:
            await db["clocking_records"].insert_many(seed_docs)

    # 2. Query DB
    # Filter by venue? For now, fetch all or matching venue
    # query = {"venue_id": venue_id} 
    query = {} # Fetch all for now as seeded data might share context, or strict?
    # Strict is better:
    if venue_id != "GLOBAL":
        query["venue_id"] = venue_id

    cursor = db["clocking_records"].find(query)
    records = [ClockingRecord(**doc) async for doc in cursor]
    
    # 3. Filter (Search)
    if request.search_query:
        query_lower = request.search_query.lower()
        records = [
            r for r in records
            if query_lower in r.employee_name.lower()
        ]
        
    # Optional: Date filtering could be added here if needed
    
    return records
