
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pprint import pprint

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "restin_v2"

async def inspect():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    col1 = "recipes_engineered"
    col2 = "RecipesEngineered"
    col3 = "recipes"
    
    count1 = await db[col1].count_documents({})
    count2 = await db[col2].count_documents({})
    count3 = await db[col3].count_documents({})
    
    print(f"Collection '{col1}': {count1} documents")
    print(f"Collection '{col2}': {count2} documents")
    print(f"Collection '{col3}': {count3} documents")
    
    if count3 > 0:
        print(f"\n--- Sample from '{col3}' ---")
        doc3 = await db[col3].find_one()
        if doc3:
            pprint(doc3)
    else:
        print(f"\nCollection '{col3}' is EMPTY.")

if __name__ == "__main__":
    asyncio.run(inspect())
