import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    db_client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = db_client["restin_v2"]
    users = await db.users.find({"venue_id": "venue-caviar-bull"}).to_list(10)
    for u in users:
        print(u["id"], u["role"], u.get("pin_hash"))

asyncio.run(main())
