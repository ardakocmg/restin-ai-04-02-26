import asyncio
from core.database import db

VENUE_ID = "venue-caviar-bull"

async def reset_runs():
    print("Deleting payroll runs for Jan 2026...")
    res = await db.payroll_runs.delete_many({
        "venue_id": VENUE_ID,
        "period_start": {"$gte": "2026-01-01"}
    })
    print(f"Deleted {res.deleted_count} runs.")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(reset_runs())
