"""Test Motor async driver with recipes_engineered collection."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def test():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["restin_v2"]
    
    print("1. Testing estimated_document_count...")
    count = await db.recipes_engineered.estimated_document_count()
    print(f"   Count: {count}")
    
    print("2. Testing find().limit(3)...")
    docs = await db.recipes_engineered.find({}).limit(3).to_list(length=3)
    print(f"   Got {len(docs)} docs")
    
    if docs:
        print(f"   First recipe: {docs[0].get('recipe_name', '?')}")
    
    print("3. Testing venues (small collection)...")
    venues = await db.venues.find({}).to_list(length=10)
    print(f"   Got {len(venues)} venues")
    
    print("DONE - Motor async works!")
    client.close()


if __name__ == "__main__":
    asyncio.run(test())
