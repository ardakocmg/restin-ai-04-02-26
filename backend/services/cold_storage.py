"""
🧊 Cold Storage Archival Service — Rule 26
Auto-archive old data to cold storage collection.
Data Janitor: scheduled cleanup for performance.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId


# Collections and their retention periods (days)
ARCHIVAL_RULES = {
    "orders": {"retention_days": 365, "archive_collection": "orders_archive"},
    "audit_trail": {"retention_days": 730, "archive_collection": "audit_archive"},
    "call_logs": {"retention_days": 180, "archive_collection": "call_logs_archive"},
    "sync_logs": {"retention_days": 90, "archive_collection": "sync_logs_archive"},
    "clocking_records": {"retention_days": 365, "archive_collection": "clocking_archive"},
    "waste_logs": {"retention_days": 365, "archive_collection": "waste_logs_archive"},
    "notifications": {"retention_days": 60, "archive_collection": "notifications_archive"},
}


async def archive_old_data(
    db,
    collection_name: str,
    date_field: str = "created_at",
    retention_days: Optional[int] = None,
    batch_size: int = 500,
    venue_id: str = "",
) -> dict:
    """
    Move old documents from a hot collection to its cold archive.
    Returns stats about the operation.
    """
    rule = ARCHIVAL_RULES.get(collection_name)
    if not rule:
        return {"error": f"No archival rule for '{collection_name}'"}

    days = retention_days or rule["retention_days"]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    query = {date_field: {"$lt": cutoff}}
    if venue_id:
        query["venue_id"] = venue_id

    source = db[collection_name]
    archive = db[rule["archive_collection"]]

    total_archived = 0
    total_deleted = 0

    while True:
        # Fetch a batch
        cursor = source.find(query).limit(batch_size)
        batch = []
        async for doc in cursor:
            doc["archived_at"] = datetime.now(timezone.utc).isoformat()
            doc["archived_from"] = collection_name
            batch.append(doc)

        if not batch:
            break

        # Insert into archive
        await archive.insert_many(batch)
        total_archived += len(batch)

        # Delete from source
        ids = [doc["_id"] for doc in batch]
        result = await source.delete_many({"_id": {"$in": ids}})
        total_deleted += result.deleted_count

    return {
        "collection": collection_name,
        "archive_collection": rule["archive_collection"],
        "retention_days": days,
        "cutoff_date": cutoff,
        "documents_archived": total_archived,
        "documents_deleted": total_deleted,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def run_full_archival(db, venue_id: str = "") -> list:
    """Run archival for all configured collections."""
    results = []
    for collection_name in ARCHIVAL_RULES:
        try:
            result = await archive_old_data(db, collection_name, venue_id=venue_id)
            results.append(result)
        except Exception as e:
            results.append({
                "collection": collection_name,
                "error": str(e),
            })
    return results


async def get_archival_stats(db) -> list:
    """Get stats for all archival collections."""
    stats = []
    for collection_name, rule in ARCHIVAL_RULES.items():
        hot_count = await db[collection_name].count_documents({})
        cold_count = await db[rule["archive_collection"]].count_documents({})
        stats.append({
            "collection": collection_name,
            "hot_count": hot_count,
            "cold_count": cold_count,
            "retention_days": rule["retention_days"],
            "archive_collection": rule["archive_collection"],
        })
    return stats


async def restore_from_archive(
    db,
    archive_collection: str,
    document_id: str,
) -> Optional[dict]:
    """Restore a single document from cold storage back to its original collection."""
    doc = await db[archive_collection].find_one({"_id": ObjectId(document_id)})
    if not doc:
        return None

    original_collection = doc.pop("archived_from", None)
    doc.pop("archived_at", None)

    if not original_collection:
        return None

    await db[original_collection].insert_one(doc)
    await db[archive_collection].delete_one({"_id": ObjectId(document_id)})

    doc["_id"] = str(doc["_id"])
    return doc
