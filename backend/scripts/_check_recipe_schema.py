import asyncio, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["restin_v2"]
    
    doc = await db.recipes.find_one({}, {"_id": 0})
    if doc:
        print("Keys:", list(doc.keys()))
        print("recipe_name:", doc.get("recipe_name", "?"))
        print("category:", doc.get("category", "?"))
        print("venue_id:", doc.get("venue_id", "?"))
        ings = doc.get("ingredients", [])
        print("ingredients count:", len(ings))
        if ings and len(ings) > 0:
            print("sample ingredient:", ings[0])
    
    venues = await db.recipes.distinct("venue_id")
    print("venue_ids:", venues)
    
    # Count per venue
    pipeline = [
        {"$group": {"_id": "$venue_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.recipes.aggregate(pipeline).to_list(20)
    print("Per venue:", results)
    
    # Categories
    cats = await db.recipes.distinct("category")
    print("Categories:", cats[:15])
    
    total = await db.recipes.count_documents({})
    print("Total recipes:", total)

asyncio.run(check())
