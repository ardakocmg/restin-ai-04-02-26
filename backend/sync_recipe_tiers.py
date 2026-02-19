
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pprint import pprint

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "restin_v2"

async def sync_tiers():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Starting Two-Tier Synchronization...")
    
    # 0. Find Organization ID (Required for new recipes)
    org_id = None
    existing_recipe = await db.recipes.find_one({"organizationId": {"$exists": True}})
    if existing_recipe:
        org_id = existing_recipe["organizationId"]
    else:
        org = await db.organizations.find_one({})
        if org:
            org_id = org["_id"]
    
    if not org_id:
        print("CRITICAL: No Organization found. Cannot create new recipes. Syncing only existing matches.")
    else:
        print(f"Using Organization ID: {org_id}")

    # 1. Fetch all Engineered Recipes
    cursor = db.recipes.find({})
    total_engineered = await db.recipes.count_documents({})
    print(f"Found {total_engineered} engineered recipes.")
    
    synced_count = 0
    created_count = 0
    
    from pymongo import UpdateOne, InsertOne
    
    bulk_ops = []
    
    async for eng_doc in cursor:
        eng_id = eng_doc["_id"] # ObjectId
        
        # Field Mapping
        name = eng_doc.get("name") or eng_doc.get("recipe_name")
        sku = eng_doc.get("sku") or eng_doc.get("item_id")
        
        if not name:
            continue

        # Try to find existing Operational Recipe
        # Priority: SKU matches -> Name matches
        op_recipe = None
        
        if sku:
             op_recipe = await db.recipes.find_one({"sku": sku})
        
        if not op_recipe and name:
             op_recipe = await db.recipes.find_one({"name": name})
             
        if op_recipe:
            # Link them
            bulk_ops.append(UpdateOne(
                {"_id": op_recipe["_id"]},
                {"$set": {"engineeredId": eng_id}}
            ))
            synced_count += 1
        elif org_id:
            # Create new Operational Recipe (Draft)
            cost_cents = 0
            
            new_recipe = {
                "organizationId": org_id,
                "name": name,
                "type": "DISH", 
                "costCents": cost_cents,
                "engineeredId": eng_id,
                "isActive": True,
                "rawImportData": eng_doc.get("rawImportData"),
                "status": "IMPORTED_DRAFT" 
            }
            
            
            bulk_ops.append(InsertOne(new_recipe))
            created_count += 1
            
        if (synced_count + created_count) % 100 == 0:
             print(f"Processed {synced_count + created_count}/{total_engineered} (Buffered: {len(bulk_ops)})...")

        if len(bulk_ops) >= 1000:
            try:
                await db.recipes.bulk_write(bulk_ops, ordered=False)
                print(f"Processed batch. Total: {synced_count + created_count}/{total_engineered}...")
            except Exception as e:
                print(f"Bulk write error: {e}")
            bulk_ops = []
            
    # Process remaining
    if bulk_ops:
        try:
            await db.recipes.bulk_write(bulk_ops, ordered=False)
        except Exception as e:
            print(f"Bulk write error (final): {e}")
            
    print(f"Sync Complete.")
    print(f"Synced (Linked): {synced_count}")
    print(f"Created (New): {created_count}")

if __name__ == "__main__":
    try:
        asyncio.run(sync_tiers())
    except Exception as e:
        print(f"Script crashed: {e}")
