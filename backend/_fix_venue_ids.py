import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient(os.environ.get("MONGODB_URI", "mongodb://localhost:27017/restin_v2"))
    db = c["restin_v2"]
    
    OLD = "698cb644c83d21c46da0a91f"
    NEW = "venue-caviar-bull"
    
    # All inventory-related collections
    colls = [
        "suppliers", "ingredients", "inventory_items", "stock_snapshots",
        "packages", "recipes", "sales_history", "purchase_orders",
        "inventory_counts", "inventory_adjustments", "receiving_logs",
        "menu_items", "products", "categories", "sub_recipes"
    ]
    
    print("=== INVENTORY AUDIT ===")
    for name in colls:
        coll = db[name]
        total = await coll.count_documents({})
        with_new = await coll.count_documents({"venue_id": NEW})
        with_old = await coll.count_documents({"venue_id": OLD})
        no_venue = total - with_new - with_old
        status = "OK" if with_old == 0 else "NEEDS FIX"
        if total == 0:
            status = "EMPTY"
        print(f"  {name:25s} total={total:5d}  venue-cb={with_new:5d}  old={with_old:5d}  other={no_venue:5d}  [{status}]")
        
        # Auto-fix if old venue found
        if with_old > 0:
            result = await coll.update_many({"venue_id": OLD}, {"$set": {"venue_id": NEW}})
            print(f"    -> FIXED: {result.modified_count} records migrated")

asyncio.run(main())
