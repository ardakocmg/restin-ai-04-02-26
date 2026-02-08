
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "restin_v2"

async def check_overlap():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    recipes_active = await db.recipes.find({}, {"name": 1}).to_list(length=None)
    recipes_engineered = await db.recipes_engineered.find({}, {"name": 1, "recipe_name": 1}).to_list(length=None)
    
    active_names = {r.get("name") for r in recipes_active if r.get("name")}
    engineered_names = set()
    for r in recipes_engineered:
        # Check both 'name' and 'recipe_name' fields
        if r.get("name"): engineered_names.add(r.get("name"))
        if r.get("recipe_name"): engineered_names.add(r.get("recipe_name"))
        
    overlap = active_names.intersection(engineered_names)
    
    print(f"Active Recipes: {len(active_names)}")
    print(f"Engineered Recipes: {len(engineered_names)}")
    print(f"Overlap Count: {len(overlap)}")
    
    if overlap:
        print(f"Sample Overlaps: {list(overlap)[:5]}")

if __name__ == "__main__":
    asyncio.run(check_overlap())
