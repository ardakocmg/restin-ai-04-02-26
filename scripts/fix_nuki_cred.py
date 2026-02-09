import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.restin_v2
    
    print("Deleting 'nuki_credentials' for venue-caviar-bull...")
    res = await db.nuki_credentials.delete_many({"venue_id": "venue-caviar-bull"})
    print(f"Deleted {res.deleted_count} documents.")

if __name__ == "__main__":
    asyncio.run(main())
