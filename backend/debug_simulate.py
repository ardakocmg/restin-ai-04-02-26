import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.data_loader import get_data_loader
from typing import List, Optional

# Mock the clean function
def _clean_and_normalize_recipes(raw_recipes: List[dict]) -> List[dict]:
    cleaned = []
    seen_ids = set()
    
    for r in raw_recipes:
        rid = r.get("id") or r.get("_id")
        if not rid: 
            continue
        rid = str(rid)
        
        if rid in seen_ids:
            continue
            
        name = r.get("recipe_name") or r.get("name")
        if not name or str(name).strip() == "":
            if "raw_import_data" in r:
                name = "Unnamed Import"
            else:
                continue
                
        raw_active = r.get("active", True)
        is_active = True
        if isinstance(raw_active, str):
            is_active = raw_active.lower() in ["true", "active", "1", "yes", "on"]
        else:
            is_active = bool(raw_active)
            
        r["id"] = rid
        r["recipe_name"] = str(name)
        r["active"] = is_active
        r["category"] = r.get("category") or "Uncategorized"
        
        cleaned.append(r)
        seen_ids.add(rid)
        
    return cleaned

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'restin_v2')

async def simulate_backend():
    print(f"Connecting to {MONGO_URL} - {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # 1. Get Seed
    loader = get_data_loader()
    seed_recipes = loader.get_recipes()
    print(f"Seed Count: {len(seed_recipes)}")
    print(f"Seed Sample: {seed_recipes[0] if seed_recipes else 'None'}")

    # 2. Get Mongo
    mongo_recipes = await db.recipes_engineered.find({}).to_list(length=None)
    for doc in mongo_recipes:
        doc["_id"] = str(doc["_id"])
    print(f"Mongo Count: {len(mongo_recipes)}")
    if mongo_recipes:
        print(f"Mongo Sample: {mongo_recipes[0]['recipe_name']}, ID: {mongo_recipes[0]['_id']}")

    # 3. Merge & Clean
    all_recipes = _clean_and_normalize_recipes(seed_recipes + mongo_recipes)
    print(f"Total Merged & Cleaned: {len(all_recipes)}")
    
    # 4. Paginate
    start = 0
    end = 50
    paginated = all_recipes[start:end]
    
    print("\n--- First 3 Paginated Items SENT TO FRONTEND ---")
    for i, item in enumerate(paginated[:3]):
        print(f"[{i}] Name: '{item.get('recipe_name')}', ID: '{item.get('id')}', Active: {item.get('active')}")
        print(f"    Keys: {list(item.keys())}")
        
    # Check Active Stats
    active_count = len([r for r in all_recipes if r["active"]])
    print(f"\nTotal Active Count: {active_count}")

if __name__ == "__main__":
    asyncio.run(simulate_backend())
