"""Expiring Soon Read Model"""
from datetime import datetime, timezone, timedelta

from core.database import db


async def build_expiring_soon(venue_id: str):
    """Build list of items expiring within 7 days"""
    cutoff = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    # Get ledger entries with expiry
    entries = await db.stock_ledger.find(
        {
            "venue_id": venue_id,
            "expiry_date": {"$lte": cutoff, "$ne": None}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Group by SKU
    by_sku = {}
    for entry in entries:
        sku_id = entry["item_id"]
        if sku_id not in by_sku:
            by_sku[sku_id] = []
        by_sku[sku_id].append(entry)
    
    # Store in read model
    for sku_id, sku_entries in by_sku.items():
        earliest_expiry = min(e["expiry_date"] for e in sku_entries if e.get("expiry_date"))
        
        await db.rm_expiring_soon.update_one(
            {"venue_id": venue_id, "sku_id": sku_id},
            {"$set": {
                "earliest_expiry": earliest_expiry,
                "entries_count": len(sku_entries),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
