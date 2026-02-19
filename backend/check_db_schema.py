"""Check DB schema for migration planning."""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check_schema():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client["restin_v2"]
    
    colls = await db.list_collection_names()
    print("=== COLLECTIONS WITH DATA ===")
    for c in sorted(colls):
        count = await db[c].count_documents({})
        if count > 0:
            print(f"  {c}: {count} docs")
    
    print("\n=== INGREDIENT SAMPLE ===")
    ing = await db["ingredients"].find_one({})
    if ing:
        print("Keys:", list(ing.keys()))
        for k in ["name", "category", "subcategory", "allergens", "unit", "venue_id", "apicbase_id"]:
            print(f"  {k} = {ing.get(k, 'N/A')}")
    else:
        print("  No ingredients found")
    
    print("\n=== RECIPE SAMPLE ===")
    rec = await db["recipes"].find_one({})
    if rec:
        print("Keys:", list(rec.keys()))
        for k in ["name", "type", "category", "subcategory", "venue_id", "sell_price"]:
            print(f"  {k} = {rec.get(k, 'N/A')}")
    else:
        print("  No recipes found")
    
    print("\n=== RECIPES_ENGINEERED ===")
    eng = await db["recipes"].find_one({})
    if eng:
        print("Keys:", list(eng.keys()))
    else:
        print("  No engineered recipes")
    
    print("\n=== VENUES ===")
    async for v in db["venues"].find({}, {"name": 1}):
        print(f"  {v['_id']}: {v.get('name')}")
    
    print("\n=== MENU_ITEMS SAMPLE ===")
    mi = await db["menu_items"].find_one({})
    if mi:
        print("Keys:", list(mi.keys()))
    else:
        print("  No menu items")
    
    print("\n=== SUPPLIERS SAMPLE ===")
    sup = await db["suppliers"].find_one({})
    if sup:
        print("Keys:", list(sup.keys()))
    else:
        print("  No suppliers")
    
    print("\n=== CATEGORIES CHECK ===")
    cats = await db["categories"].find_one({})
    if cats:
        print("Keys:", list(cats.keys()))
    else:
        print("  No categories collection")
    
    client.close()

asyncio.run(check_schema())
