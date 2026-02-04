from fastapi import APIRouter
from core.database import db
from datetime import datetime, timedelta, timezone
import random
import uuid

router = APIRouter(tags=["Admin"])

@router.post("/admin/seed-clocking-history")
async def seed_clocking_history_endpoint():
    """Generate 30 days of clocking history for ACTIVE employees"""
    print("Starting Clocking History Seeding...")
    
    # 1. Get Active Employees
    employees = await db.employees.find({"employment_status": "active"}).to_list(1000)
    
    if not employees:
        return {"message": "No active employees found to seed data for.", "count": 0}
        
    records = []
    
    # 2. Generate Dates (Last 30 Days)
    today = datetime.now()
    dates = [today - timedelta(days=x) for x in range(30)]
    dates.reverse() # Oldest to newest
    
    print(f"   Found {len(employees)} employees. Generating data for {len(dates)} days...")
    
    for date_obj in dates:
        # Skip Weekends (Sat/Sun) with 80% probability
        is_weekend = date_obj.weekday() >= 5
        if is_weekend and random.random() > 0.2:
            continue
            
        date_str = date_obj.strftime("%d/%m/%Y")
        day_name = date_obj.strftime("%A")
        
        for emp in employees:
            # 10% chance of absence on a weekday
            if not is_weekend and random.random() < 0.1:
                continue
                
            # Random Shift Times (09:00 - 18:00 approx)
            start_hour = 8 + random.randint(0, 2) # 8, 9, 10
            start_min = random.randint(0, 59)
            
            # Work 8 +/- 1 hours
            work_hours = 8 + random.uniform(-0.5, 1.5)
            end_time_decimal = start_hour + (start_min/60) + work_hours
            
            end_hour = int(end_time_decimal)
            end_min = int((end_time_decimal - end_hour) * 60)
            
            # Format
            clock_in = f"{start_hour:02d}:{start_min:02d}"
            clock_out = f"{end_hour:02d}:{end_min:02d}"
            
            # Calculate cost (rough)
            # Find closest hourly rate from Mock if possible, or default
            hourly_rate = emp.get("hourly_rate", 10.00) # Default 10 EUR
            total_cost = round(work_hours * hourly_rate, 2)
            
            # Create Record
            record = {
                "id": f"clk_{emp['id']}_{date_obj.strftime('%Y%m%d')}",
                "venue_id": emp.get("venue_id", "GLOBAL"),
                "employee_id": emp["id"],
                "employee_code": emp.get("display_id", emp["id"]),
                "employee_name": emp["name"],
                "employee_designation": emp.get("role", "Staff"),
                "cost_centre": emp.get("cost_centre", emp.get("venue_id", "N/A")),
                "date": date_str,      # DD/MM/YYYY
                "day_of_week": day_name,
                "clock_in": clock_in,
                "clock_out": clock_out,
                "hours_worked": round(work_hours, 2),
                "total_cost": total_cost,
                "status": "APPROVED",
                "remarks": "Auto-Generated History",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "modified_by": "System"
            }
            records.append(record)
            
    # 3. Insert Data
    if records:
        # clear old mock data first? strict user might want clean slate
        # await db.clocking_records.delete_many({}) 
        # Actually append is safer, but user complained "no records", so likely empty.
        
        # Using loop for MockDB safety as per previous lesson
        count = 0
        for r in records:
            # Check duplicate to avoid clutter if run twice
            exists = await db.clocking_records.find_one({"id": r["id"]})
            if not exists:
                await db.clocking_records.insert_one(r)
                count += 1
                
        print(f"Generated {count} clocking records.")
        return {
            "message": "Clocking history generated successfully", 
            "employees_processed": len(employees),
            "days_covered": 30,
            "records_created": count
        }
    
    return {"message": "No records generated (all skipped?)", "count": 0}

def create_clocking_seeder_router():
    return router
