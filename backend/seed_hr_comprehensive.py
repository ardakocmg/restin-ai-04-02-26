import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import uuid

# Import mock data
import sys
sys.path.append(os.getcwd())
from mock_data_store import MOCK_EMPLOYEES, MOCK_CLOCKING

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restin_ai_db')]

async def seed_hr():
    print("Seeding HR data from mock_data_store.py...")
    
    # 1. Clear existing HR data to avoid duplicates (optional, but good for clean seed)
    # await db.employees.delete_many({})
    # await db.shifts.delete_many({})
    # await db.attendance_logs.delete_many({})
    
    # 2. Seed Employees
    employees_to_insert = []
    for code, emp in MOCK_EMPLOYEES.items():
        # Map mock data to DB schema
        doc = {
            "id": code,
            "display_id": f"EMP-{code}",
            "venue_id": "venue-caviar-bull", # Defaulting for now
            "name": emp["full_name"],
            "email": emp["email"],
            "phone": emp["mobile"],
            "occupation": emp["occupation"],
            "department": emp["department"],
            "employment_status": "active",
            "hire_date": emp["employment_date"],
            "id_number": emp["id_number"],
            "payroll": {
                "hourly_rate": emp["hourly_rate"],
                "currency": "EUR"
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if exists
        existing = await db.employees.find_one({"id": code})
        if not existing:
            employees_to_insert.append(doc)
    
    if employees_to_insert:
        print(f"Inserted {len(employees_to_insert)} employees")
    else:
        print("Employees already seeded")

    # 3. Seed Shifts (from MOCK_CLOCKING)
    shifts_to_insert = []
    # We'll only insert a subset if it's too large, or just all of them for 90 days
    print(f"Processing {len(MOCK_CLOCKING)} clocking records into shifts...")
    
    for clk in MOCK_CLOCKING:
        # Map date "26/01/2026" to ISO or similar
        try:
            d, m, y = clk["date"].split("/")
            iso_date = f"{y}-{m}-{d}"
            
            shift_doc = {
                "id": clk["id"],
                "employee_id": clk["employee_code"],
                "venue_id": "venue-caviar-bull",
                "date": iso_date,
                "scheduled_start": f"{iso_date}T{clk['clock_in']}:00",
                "scheduled_end": f"{iso_date}T{clk['clock_out']}:00",
                "actual_start": f"{iso_date}T{clk['clock_in']}:00",
                "actual_end": f"{iso_date}T{clk['clock_out']}:00",
                "status": "completed",
                "hours_worked": clk["hours_worked"],
                "total_cost": clk["total_cost"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Use update_one with upsert to avoid duplicates if run multiple times
            await db.shifts.update_one(
                {"id": clk["id"]},
                {"$set": shift_doc},
                upsert=True
            )
        except Exception as e:
            print(f"Error processing clocking {clk['id']}: {e}")
            continue

    print("Processed shifts from mock clockings")
    print("\nHR Seeding Completed!")

if __name__ == "__main__":
    asyncio.run(seed_hr())
