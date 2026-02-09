"""Migrate local MongoDB data to Atlas."""
from pymongo import MongoClient
from urllib.parse import quote_plus
import sys

# Source: Local MongoDB
LOCAL_URI = "mongodb://localhost:27017"
LOCAL_DB = "restin_v2"

# Destination: Atlas
ATLAS_USER = "restinai"
ATLAS_PASS = "MzTr8\u00a36_4*F@"
ATLAS_HOST = "cluster0.5ndlsdd.mongodb.net"
ATLAS_DB = "restin_v2"

def main():
    # Connect local
    print("Connecting to local MongoDB...")
    local = MongoClient(LOCAL_URI, serverSelectionTimeoutMS=5000)
    try:
        local.admin.command('ping')
        print("  Local OK")
    except Exception as e:
        print(f"  Local FAILED: {e}")
        sys.exit(1)
    
    local_db = local[LOCAL_DB]
    
    # Connect Atlas
    encoded_pass = quote_plus(ATLAS_PASS)
    atlas_uri = f"mongodb+srv://{ATLAS_USER}:{encoded_pass}@{ATLAS_HOST}/{ATLAS_DB}?retryWrites=true&w=majority&appName=Cluster0"
    
    print("Connecting to Atlas...")
    try:
        atlas = MongoClient(atlas_uri, serverSelectionTimeoutMS=15000)
        atlas.admin.command('ping')
        print("  Atlas OK")
    except Exception as e:
        print(f"  Atlas FAILED: {e}")
        sys.exit(1)
    
    atlas_db = atlas[ATLAS_DB]
    
    # Migrate collections
    collections = local_db.list_collection_names()
    print(f"\nFound {len(collections)} collections to migrate\n")
    
    total = 0
    for coll_name in sorted(collections):
        docs = list(local_db[coll_name].find({}))
        count = len(docs)
        if count > 0:
            atlas_db[coll_name].drop()
            # Batch insert
            for i in range(0, count, 500):
                batch = docs[i:i+500]
                atlas_db[coll_name].insert_many(batch)
            total += count
            print(f"  OK  {coll_name}: {count} docs")
        else:
            print(f"  --  {coll_name}: empty")
    
    print(f"\nDONE! {total} documents migrated across {len(collections)} collections")
    local.close()
    atlas.close()

if __name__ == "__main__":
    main()
