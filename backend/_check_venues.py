import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient("mongodb+srv://restinai:lTxLH4ncbKTocAwl@cluster0.5ndlsdd.mongodb.net/restin_v2?retryWrites=true")
    db = c["restin_v2"]
    VID = "venue-caviar-bull"
    
    print("=== INVENTORY FEATURE AUDIT ===\n")
    
    checks = {
        "suppliers": {"query": {"venue_id": VID}},
        "ingredients": {"query": {"venue_id": VID}},
        "inventory_items": {"query": {"venue_id": VID}},
        "recipes": {"query": {"venue_id": VID}},
        "stock_snapshots": {"query": {}},
        "purchase_orders": {"query": {"venue_id": VID}},
        "inventory_counts": {"query": {"venue_id": VID}},
        "inventory_adjustments": {"query": {"venue_id": VID}},
        "receiving_logs": {"query": {"venue_id": VID}},
        "waste_logs": {"query": {"venue_id": VID}},
        "stock_transfers": {"query": {"venue_id": VID}},
        "production_orders": {"query": {"venue_id": VID}},
        "menu_items": {"query": {"venue_id": VID}},
        "sales_history": {"query": {}},
        "categories": {"query": {}},
    }
    
    for name, cfg in checks.items():
        total = await db[name].count_documents(cfg["query"])
        all_total = await db[name].count_documents({})
        flag = "HAS DATA" if total > 0 else ("EMPTY (has " + str(all_total) + " in other venues)" if all_total > 0 else "EMPTY")
        print(f"  {name:25s} {total:5d} records  [{flag}]")

asyncio.run(main())
