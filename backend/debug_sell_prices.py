"""Quick fix: debug and fix null venue_ids in outlet_sell_prices."""
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["restin_v2"]

    # 1. Check what outlet_names the null-venue records have
    pipeline = [
        {"$match": {"venue_id": None}},
        {"$group": {"_id": "$outlet_name", "count": {"$sum": 1}}}
    ]
    results = await db.outlet_sell_prices.aggregate(pipeline).to_list(20)
    print("Null venue_id by outlet_name:")
    for r in results:
        print(f"  '{r['_id']}': {r['count']}")

    # Also check apicbase_outlet_id
    pipeline2 = [
        {"$match": {"venue_id": None}},
        {"$group": {"_id": "$apicbase_outlet_id", "count": {"$sum": 1}}}
    ]
    results2 = await db.outlet_sell_prices.aggregate(pipeline2).to_list(20)
    print("\nNull venue_id by apicbase_outlet_id:")
    for r in results2:
        print(f"  '{r['_id']}': {r['count']}")

    # 2. Map and fix using Apicbase outlet IDs
    # Get venue ObjectIds
    venue_map = {}
    async for v in db.venues.find({}, {"name": 1}):
        name = v.get("name", "")
        oid = str(v["_id"])
        if "Caviar" in name:
            venue_map["caviar"] = oid
        elif "Don Royale" in name:
            venue_map["don"] = oid
        elif "Sole" in name or "Tarragon" in name:
            venue_map["sole"] = oid

    print(f"\nVenue map: {venue_map}")

    # Fix: distribute all null venue_ids equally across 3 outlets based on apicbase_outlet_id
    # First check a sample
    sample = await db.outlet_sell_prices.find_one({"venue_id": None})
    if sample:
        del sample["_id"]
        print(f"\nSample null record: {sample}")

    # The outlet_sell_prices file has 3 outlets per recipe, but outlet_name might be None
    # Let's check the original outlet_id pattern
    all_outlet_ids = await db.outlet_sell_prices.distinct("apicbase_outlet_id")
    print(f"\nAll apicbase_outlet_ids: {all_outlet_ids}")
    for oid in all_outlet_ids:
        count = await db.outlet_sell_prices.count_documents({"apicbase_outlet_id": oid})
        print(f"  {oid}: {count} records")

    # Map each outlet_id to a venue
    # Since outlet_name is None, we need to figure out which apicbase_outlet_id maps to which venue
    # Check ones that DO have venue_id
    non_null = await db.outlet_sell_prices.find({"venue_id": {"$ne": None}}).to_list(10)
    for doc in non_null:
        print(f"\n  Has venue: outlet_id={doc.get('apicbase_outlet_id')}, "
              f"outlet_name={doc.get('outlet_name')}, venue_id={doc.get('venue_id')}")

    client.close()

asyncio.run(main())
