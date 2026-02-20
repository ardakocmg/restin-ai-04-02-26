import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient("mongodb://localhost:27017")
    db = c["restin_v2"]
    venues = await db.venues.find({}).to_list(10)
    print(f"Found {len(venues)} venues:")
    for v in venues:
        v_copy = dict(v)
        v_copy.pop("_id", None)
        print(f"  id={v.get('id')}, name={v.get('name')}, keys={list(v.keys())}")
    
    # Also check categories and menu_items
    cats = await db.categories.count_documents({})
    items = await db.menu_items.count_documents({})
    tables = await db.tables.count_documents({})
    print(f"\nCategories: {cats}")
    print(f"Menu Items: {items}")
    print(f"Tables: {tables}")

asyncio.run(main())
