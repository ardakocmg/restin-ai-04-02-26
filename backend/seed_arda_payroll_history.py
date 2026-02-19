import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Setup paths
PROJ_ROOT = Path(r"c:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\main-new2801-with-hr-main\main-new2801-with-hr-main")
BACKEND_DIR = PROJ_ROOT / "backend"
load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "restin_v2")
VENUE_ID = "venue-caviar-bull"
EMPLOYEE_ID = "0307741A" # Arda

async def seed_dec25_run():
    print(f"Creating Historical Payroll Run (Dec 2025) for comparison...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # 1. Fetch Employee
    employee = await db.employees.find_one({"id": EMPLOYEE_ID, "venue_id": VENUE_ID})
    if not employee:
        print("Employee Arda Koc not found, creating placeholder...")
        employee = {
            "id": EMPLOYEE_ID,
            "name": "ARDA KOC",
            "employee_number": "KOC",
            "id_card": "0307741A"
        }
    
    # 2. Define Payslip Data (Matching the 'Standard' 26k profile approx)
    # Using the values verified in test doc
    gross = 2166.67
    tax = 185.40
    ssc = 210.00 # Approx 10%
    net = gross - tax - ssc
    
    payslip = {
        "employee_id": EMPLOYEE_ID,
        "employee_name": employee.get("name"),
        "employee_number": employee.get("employee_number", "KOC"),
        "id_card": employee.get("id_number", "0307741A"),
        "gross_pay": gross,
        "net_pay": net,
        "tax_amount": tax,
        "total_deductions": tax + ssc,
        "basic_pay": gross,
        "iban": "MT55HSBC0000000000000",
        "components": [
             {"component_name": "Basic Pay", "amount": gross, "type": "earning"},
             {"component_name": "FSS Tax", "amount": tax, "type": "deduction"},
             {"component_name": "Social Security", "amount": ssc, "type": "deduction"}
        ]
    }
    
    # 3. Create Run
    run_id = "run_dec_2025_comparison"
    run_data = {
        "id": run_id,
        "venue_id": VENUE_ID,
        "run_name": "December 2025 (Historical)",
        "period": "2025-12",
        "period_start": "01/12/2025",
        "period_end": "31/12/2025",
        "state": "approved",
        "employee_count": 1,
        "total_gross": gross,
        "total_tax": tax,
        "total_net": net,
        "payslips": [payslip],
        "created_at": datetime.now(timezone.utc),
        "created_by": "system_migration"
    }
    
    await db.payroll_runs.update_one(
        {"id": run_id},
        {"$set": run_data},
        upsert=True
    )
    
    print("Done! Created run: 'December 2025 (Historical)'")
    print(f"ID: {run_id}")

if __name__ == "__main__":
    asyncio.run(seed_dec25_run())
