"""Debug script to check recipe data in MongoDB."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def debug():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["restin_v2"]
    
    # 1. Count total docs
    count = await db.recipes_engineered.count_documents({})
    print(f"[1] Total documents in recipes_engineered: {count}")
    
    if count == 0:
        print("[!] No recipes in DB. Run seed_data.py first.")
        client.close()
        return
    
    # 2. Sample one document to see structure
    sample = await db.recipes_engineered.find_one()
    sample["_id"] = str(sample["_id"])
    print(f"\n[2] Sample document keys: {list(sample.keys())}")
    print(f"    Has 'name': {'name' in sample}")
    print(f"    Has 'recipe_name': {'recipe_name' in sample}")
    print(f"    Has 'id': {'id' in sample}")
    print(f"    Has 'active': {'active' in sample}")
    print(f"    Has 'deleted': {'deleted' in sample}")
    print(f"    'name' value: {sample.get('name', 'MISSING')}")
    print(f"    'recipe_name' value: {sample.get('recipe_name', 'MISSING')}")
    print(f"    'id' value: {sample.get('id', 'MISSING')}")
    print(f"    'active' value: {sample.get('active', 'MISSING')}")
    
    # 3. Check how many have a 'name' or 'recipe_name' field
    with_name = await db.recipes_engineered.count_documents({"name": {"$exists": True, "$ne": ""}})
    with_recipe_name = await db.recipes_engineered.count_documents({"recipe_name": {"$exists": True, "$ne": ""}})
    with_id = await db.recipes_engineered.count_documents({"id": {"$exists": True}})
    without_id = await db.recipes_engineered.count_documents({"id": {"$exists": False}})
    
    print(f"\n[3] Field analysis:")
    print(f"    With 'name' field: {with_name}")
    print(f"    With 'recipe_name' field: {with_recipe_name}")
    print(f"    With 'id' field: {with_id}")
    print(f"    Without 'id' field (only _id): {without_id}")
    
    # 4. List all collections
    collections = await db.list_collection_names()
    print(f"\n[4] All collections in restin_v2: {collections}")
    
    # 5. Count docs in all collections
    for col_name in collections:
        col_count = await db[col_name].count_documents({})
        print(f"    {col_name}: {col_count} docs")
    
    client.close()
    print("\n[DONE] Debug complete.")

if __name__ == "__main__":
    asyncio.run(debug())
