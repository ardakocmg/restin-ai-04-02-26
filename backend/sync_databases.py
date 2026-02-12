"""
RESTIN.AI — Bidirectional Database Sync (Atlas <-> Local)
=========================================================
Merges data between Atlas and Local MongoDB.
Rules:
  - NO deletions. Only upserts.
  - Documents matched by 'id' field (or '_id' fallback).
  - If doc exists in one but not the other -> INSERT into the other.
  - If doc exists in both -> keep the one with newer 'updated_at' / 'created_at'.
  - Collections without 'id' field use '_id'.

Usage:
  python sync_databases.py                # Compare only (dry run)
  python sync_databases.py --execute      # Actually merge
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

# ── Connection strings ───────────────────────────────────────────────────
ATLAS_URL = os.getenv("MONGO_URL", "")
LOCAL_URL = "mongodb://localhost:27017"
DB_NAME = os.getenv("DB_NAME", "restin_v2")

# Collections to sync (all relevant ones)
COLLECTIONS = [
    "employees",
    "users",
    "employee_details",
    "payroll_runs",
    "fs3_entries",
    "fs5_forms",
    "fs7_forms",
    "shifts",
    "clocking_records",
    "venues",
    "venue_configs",
    "approval_requests",
    "documents",
    "tables",
    "floors",
    "orders",
    "menu_items",
    "menu_categories",
    "inventory_items",
    "recipes",
    "suppliers",
    "purchase_orders",
]


def get_doc_id(doc: dict) -> str:
    """Get a unique identifier for a document."""
    if "id" in doc and doc["id"]:
        return str(doc["id"])
    if "_id" in doc:
        return str(doc["_id"])
    return ""


def get_timestamp(doc: dict) -> str:
    """Get the most recent timestamp from a document for conflict resolution."""
    for field in ["updated_at", "created_at", "timestamp"]:
        if field in doc and doc[field]:
            return str(doc[field])
    return ""


async def compare_and_sync(execute: bool = False):
    """Compare Atlas vs Local and optionally merge."""

    print("=" * 70)
    print("  RESTIN.AI — Database Sync Tool")
    print(f"  Mode: {'EXECUTE (will merge)' if execute else 'DRY RUN (compare only)'}")
    print("=" * 70)

    # Connect to both
    atlas_client = AsyncIOMotorClient(ATLAS_URL)
    local_client = AsyncIOMotorClient(LOCAL_URL)

    atlas_db = atlas_client[DB_NAME]
    local_db = local_client[DB_NAME]

    # Test connections
    try:
        await atlas_client.admin.command("ping")
        print("\n  [OK] Atlas connected")
    except Exception as e:
        print(f"\n  [FAIL] Atlas connection failed: {e}")
        return

    try:
        await local_client.admin.command("ping")
        print("  [OK] Local connected")
    except Exception as e:
        print(f"\n  [FAIL] Local connection failed: {e}")
        return

    print("\n" + "-" * 70)
    print(f"  {'Collection':<25} {'Atlas':>8} {'Local':>8} {'Only Atlas':>12} {'Only Local':>12} {'Common':>8}")
    print("-" * 70)

    total_atlas_to_local = 0
    total_local_to_atlas = 0

    for coll_name in COLLECTIONS:
        atlas_coll = atlas_db[coll_name]
        local_coll = local_db[coll_name]

        # Fetch all docs from both
        atlas_docs = await atlas_coll.find({}).to_list(10000)
        local_docs = await local_coll.find({}).to_list(10000)

        atlas_count = len(atlas_docs)
        local_count = len(local_docs)

        if atlas_count == 0 and local_count == 0:
            continue  # Skip empty collections

        # Build lookup maps by 'id' field
        atlas_map = {}
        for doc in atlas_docs:
            key = get_doc_id(doc)
            if key:
                atlas_map[key] = doc

        local_map = {}
        for doc in local_docs:
            key = get_doc_id(doc)
            if key:
                local_map[key] = doc

        # Find differences
        only_in_atlas = set(atlas_map.keys()) - set(local_map.keys())
        only_in_local = set(local_map.keys()) - set(atlas_map.keys())
        common = set(atlas_map.keys()) & set(local_map.keys())

        print(f"  {coll_name:<25} {atlas_count:>8} {local_count:>8} {len(only_in_atlas):>12} {len(only_in_local):>12} {len(common):>8}")

        total_atlas_to_local += len(only_in_atlas)
        total_local_to_atlas += len(only_in_local)

        if execute:
            # ── Atlas -> Local (docs only in Atlas, copy to Local) ────────
            if only_in_atlas:
                for doc_id in only_in_atlas:
                    doc = atlas_map[doc_id].copy()
                    doc.pop("_id", None)  # Remove MongoDB _id to let local generate its own
                    await local_coll.update_one(
                        {"id": doc.get("id", doc_id)},
                        {"$set": doc},
                        upsert=True
                    )

            # ── Local -> Atlas (docs only in Local, copy to Atlas) ────────
            if only_in_local:
                for doc_id in only_in_local:
                    doc = local_map[doc_id].copy()
                    doc.pop("_id", None)
                    await atlas_coll.update_one(
                        {"id": doc.get("id", doc_id)},
                        {"$set": doc},
                        upsert=True
                    )

            # ── Common docs: keep newer version in both ──────────────────
            for doc_id in common:
                atlas_ts = get_timestamp(atlas_map[doc_id])
                local_ts = get_timestamp(local_map[doc_id])

                if atlas_ts > local_ts:
                    # Atlas is newer -> update local
                    doc = atlas_map[doc_id].copy()
                    doc.pop("_id", None)
                    await local_coll.update_one(
                        {"id": doc.get("id", doc_id)},
                        {"$set": doc}
                    )
                elif local_ts > atlas_ts:
                    # Local is newer -> update atlas
                    doc = local_map[doc_id].copy()
                    doc.pop("_id", None)
                    await atlas_coll.update_one(
                        {"id": doc.get("id", doc_id)},
                        {"$set": doc}
                    )
                # If equal timestamps, skip (already in sync)

    print("-" * 70)
    print(f"\n  Summary:")
    print(f"    Docs only in Atlas (will copy to Local): {total_atlas_to_local}")
    print(f"    Docs only in Local (will copy to Atlas): {total_local_to_atlas}")

    if execute:
        print(f"\n  [DONE] Bidirectional merge complete!")
    else:
        print(f"\n  [DRY RUN] No changes made. Run with --execute to merge.")

    print("=" * 70)

    atlas_client.close()
    local_client.close()


if __name__ == "__main__":
    execute = "--execute" in sys.argv
    asyncio.run(compare_and_sync(execute))
