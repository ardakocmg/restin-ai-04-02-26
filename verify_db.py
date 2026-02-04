import sys
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "restin_ai_db")

async def check_db():
    print(f"Connecting to {MONGO_URL}...")
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        # Force a connection verification
        await client.server_info()
        print("SUCCESS: Connected to MongoDB.")
        
        db = client[DB_NAME]
        collections = await db.list_collection_names()
        print(f"Collections found: {len(collections)}")
        
        target_collections = ["employees", "attendance_logs", "shifts", "payroll_runs", "venues", "users"]
        for coll_name in target_collections:
            count = await db[coll_name].count_documents({})
            print(f" - {coll_name}: {count}")
            
        return True
    except Exception as e:
        print(f"FAILURE: Could not connect to MongoDB. Error: {e}")
        return False

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    success = loop.run_until_complete(check_db())
    sys.exit(0 if success else 1)
