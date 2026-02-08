
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pprint import pprint

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "restin_v2"

async def inspect():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    col = "RecipesEngineered"
    doc = await db[col].find_one()
    
    print(f"--- Sample from '{col}' ---")
    if doc:
        pprint(doc)
    else:
        print("Empty")

if __name__ == "__main__":
    asyncio.run(inspect())
