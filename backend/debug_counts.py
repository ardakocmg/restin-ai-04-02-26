import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.data_loader import get_data_loader

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'restin_v2')

async def inspectdict():
    print(f"Connecting to {MONGO_URL} - {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    mongo_count = await db.recipes_engineered.count_documents({})
    print(f"MongoDB Count: {mongo_count}")

    loader = get_data_loader()
    seed_recipes = loader.get_recipes()
    print(f"Seed Data Count: {len(seed_recipes)}")
    
    # Check for empty names in Mongo
    empty_name_count = await db.recipes_engineered.count_documents({"recipe_name": {"$in": ["", None]}})
    print(f"MongoDB Empty Name Count: {empty_name_count}")
    
    # Check for empty IDs in Mongo
    empty_id_count = await db.recipes_engineered.count_documents({"id": {"$in": ["", None]}})
    print(f"MongoDB Empty ID Count: {empty_id_count}")

if __name__ == "__main__":
    asyncio.run(inspectdict())
