#!/usr/bin/env python3
"""
MongoDB Atlas Backup Script — Dumps all collections to JSON files.
Run: python scripts/backup_mongodb.py
Schedule: Add to crontab for daily backups.

Requires: pip install pymongo[srv]
"""
import os
import json
import sys
from datetime import datetime
from pymongo import MongoClient
from bson import json_util

# Configuration
MONGO_URL = os.environ.get("MONGO_URL")
if not MONGO_URL:
    print("❌ MONGO_URL environment variable not set. Aborting.")
    sys.exit(1)
DB_NAME = os.environ.get("DB_NAME", "restin_v2")
BACKUP_DIR = os.environ.get("BACKUP_DIR", "./backups")


def backup():
    """Export all collections from MongoDB to timestamped JSON files."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, timestamp)
    os.makedirs(backup_path, exist_ok=True)

    print(f"Connecting to MongoDB...")
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    collections = db.list_collection_names()
    print(f"Found {len(collections)} collections")

    total_docs = 0
    for col_name in sorted(collections):
        collection = db[col_name]
        docs = list(collection.find({}))
        count = len(docs)
        total_docs += count

        # Write to JSON using bson json_util for ObjectId serialization
        filepath = os.path.join(backup_path, f"{col_name}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(docs, f, default=json_util.default, indent=2, ensure_ascii=False)

        print(f"  ✓ {col_name}: {count} documents")

    client.close()
    print(f"\nBackup complete: {total_docs} documents → {backup_path}")
    return backup_path


if __name__ == "__main__":
    backup()
