"""Verify all inventory collections have proper data."""
import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client["restin_v2"]

    print("=== INVENTORY DATA VERIFICATION ===")
    collections = [
        "suppliers", "ingredients", "ingredient_packages",
        "outlet_sell_prices", "pricebook", "procurement_history",
        "sales_history", "stock_snapshots", "stock_counts", "variance_reports"
    ]
    for c in collections:
        count = await db[c].count_documents({})
        has_id = await db[c].count_documents({"id": {"$exists": True, "$ne": None}})
        has_vid = await db[c].count_documents({"venue_id": {"$exists": True, "$ne": None}})
        print(f"  {c:25s} | docs:{count:5d} | has_id:{has_id:5d} | has_venue:{has_vid:5d}")

    print()
    print("=== MIGRATION LOGS ===")
    logs = await db.migration_logs.find({}).sort("started_at", -1).limit(5).to_list(5)
    for log in logs:
        src = log.get("source", "?")
        mode = log.get("mode", "?")
        status = log.get("status", "?")
        fname = log.get("filename", "?")
        ts = str(log.get("started_at", ""))[:19]
        print(f"  {src} | {mode} | {status} | {fname} | {ts}")

    print()
    print("=== RECIPES ENGINEERED ===")
    rec_count = await db.recipes.count_documents({})
    print(f"Total recipes: {rec_count}")
    if rec_count > 0:
        sample = await db.recipes.find_one({}, {"_id": 0, "name": 1, "item_id": 1, "venue_id": 1, "category": 1})
        print(f"Sample: {sample}")

    client.close()

asyncio.run(main())
