"""Fix remaining sell prices and create comprehensive API endpoints."""
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["restin_v2"]

    # Fix global sell prices (apicbase_outlet_id='ALL')
    update_doc = {"$set": {"venue_id": "all", "outlet_name": "All Outlets (Default)"}}
    result = await db.outlet_sell_prices.update_many(
        {"apicbase_outlet_id": "ALL", "venue_id": None},
        update_doc
    )
    print(f"Fixed {result.modified_count} global sell prices")

    # Verify final state
    null_count = await db.outlet_sell_prices.count_documents({"venue_id": None})
    all_count = await db.outlet_sell_prices.count_documents({"venue_id": "all"})
    total = await db.outlet_sell_prices.count_documents({})
    print(f"Total: {total}, Global(all): {all_count}, Null: {null_count}")

    # Final comprehensive audit
    print("\n" + "=" * 60)
    print("COMPLETE DATA RELATIONSHIP STATUS")
    print("=" * 60)

    checks = [
        ("suppliers", "id", None),
        ("suppliers", "venue_id", None),
        ("ingredients", "id", None),
        ("ingredients", "supplier_id", None),
        ("ingredient_packages", "supplier_id", None),
        ("ingredient_packages", "ingredient_id", None),
        ("outlet_sell_prices", "venue_id", None),
        ("stock_snapshots", "ingredient_id", None),
        ("procurement_history", "venue_id", "venue-"),
        ("stock_counts", "venue_id", "venue-"),
        ("variance_reports", "venue_id", "venue-"),
        ("sales_history", "venue_id", "venue-"),
    ]

    for coll_name, field, exclude_prefix in checks:
        total = await db[coll_name].count_documents({})
        has_field = await db[coll_name].count_documents({field: {"$exists": True, "$ne": None}})
        pct = (has_field / total * 100) if total else 0
        status = "OK" if pct > 90 else "WARN" if pct > 50 else "FAIL"
        print(f"  [{status}] {coll_name}.{field}: {has_field}/{total} ({pct:.0f}%)")

    print("=" * 60)
    client.close()

asyncio.run(main())
