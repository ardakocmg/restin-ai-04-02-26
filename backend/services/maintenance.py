"""
Database Maintenance - Deduplication & Cleanup
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict

async def deduplicate_collection(db: AsyncIOMotorDatabase, collection_name: str, key_field: str) -> int:
    """
    Remove duplicate records, keeping newest
    Returns: count of removed documents
    """
    removed_count = 0
    collection = db[collection_name]
    
    # Find duplicates
    pipeline = [
        {"$match": {key_field: {"$ne": None}}},
        {"$group": {
            "_id": f"${key_field}",
            "ids": {"$push": "$_id"},
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    
    duplicate_groups = await collection.aggregate(pipeline).to_list(1000)
    
    for group in duplicate_groups:
        key_val = group["_id"]
        
        # Find latest document
        latest_doc = await collection.find_one(
            {key_field: key_val},
            sort=[("updated_at", -1), ("created_at", -1)]
        )
        
        if latest_doc:
            # Delete all except latest
            result = await collection.delete_many({
                key_field: key_val,
                "_id": {"$ne": latest_doc["_id"]}
            })
            removed_count += result.deleted_count
    
    return removed_count

async def run_maintenance(db: AsyncIOMotorDatabase, venue_id: str = None) -> Dict[str, int]:
    """
    Run database maintenance (deduplication)
    """
    results = {}
    
    # Collections to clean
    collections_to_clean = [
        ("orders", "id"),
        ("kds_tickets", "id"),
        ("users", "id"),
        ("menu_items", "id"),
        ("tables", "id"),
        ("guests", "id"),
        ("reservations", "id")
    ]
    
    for collection_name, key_field in collections_to_clean:
        removed = await deduplicate_collection(db, collection_name, key_field)
        results[collection_name] = removed
    
    total = sum(results.values())
    print(f"[Maintenance] Completed. Removed {total} duplicates. Details: {results}")
    
    return results
