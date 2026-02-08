import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pprint import pprint

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'restin_v2')

async def inspect_db():
    print(f"Connecting to {MONGO_URL} - {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    count = await db.recipes_engineered.count_documents({})
    print(f"Total documents in recipes_engineered: {count}")
    
    print("\n--- First 5 Documents ---")
    cursor = db.recipes_engineered.find({}).limit(5)
    async for doc in cursor:
        doc['_id'] = str(doc['_id'])
        pprint(doc)
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(inspect_db())
