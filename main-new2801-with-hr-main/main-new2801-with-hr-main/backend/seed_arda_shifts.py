import asyncio
from datetime import datetime, timedelta, timezone
from core.database import db
import random

EMPLOYEE_ID = "0307741A" # Arda Koc
VENUE_ID = "venue-caviar-bull"

async def seed_shifts():
    print(f"Seeding shifts for {EMPLOYEE_ID}...")
    
    # Create shifts for Jan 1-20, 2026
    start_date = datetime(2026, 1, 1)
    shifts = []
    
    for i in range(15): # 15 shifts
        day = start_date + timedelta(days=i)
        if day.weekday() < 5: # Weekdays
            start = day.replace(hour=9, minute=0)
            end = day.replace(hour=17, minute=0)
            hours = 8.0
            
            shift = {
                "venue_id": VENUE_ID,
                "employee_id": EMPLOYEE_ID,
                "employee_name": "ARDA KOC",
                "role": "IN HOUSE STRATEGIST",
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "date": day.strftime("%Y-%m-%d"),
                "hours_worked": hours,
                "hourly_rate": 25.0, # from his profile
                "total_cost": hours * 25.0,
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            shifts.append(shift)
            
    if shifts:
        await db.shifts.insert_many(shifts)
        print(f"Inserted {len(shifts)} shifts.")
    else:
        print("No shifts to insert.")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(seed_shifts())
