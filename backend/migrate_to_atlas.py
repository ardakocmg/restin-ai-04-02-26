"""Migrate local MongoDB data to Atlas - pre-encoded password."""
from pymongo import MongoClient
import sys

LOCAL_URI = "mongodb://localhost:27017"
ATLAS_URI = "mongodb+srv://restinai:MzTr8%C2%A36_4%2AF%40@cluster0.5ndlsdd.mongodb.net/restin_v2?retryWrites=true&w=majority&appName=Cluster0"

def main():
    print("Connecting to local MongoDB...", flush=True)
    local = MongoClient(LOCAL_URI, serverSelectionTimeoutMS=5000)
    local.admin.command('ping')
    print("  Local OK", flush=True)
    local_db = local['restin_v2']
    
    print("Connecting to Atlas...", flush=True)
    atlas = MongoClient(ATLAS_URI, serverSelectionTimeoutMS=15000)
    atlas.admin.command('ping')
    print("  Atlas OK", flush=True)
    atlas_db = atlas['restin_v2']
    
    collections = local_db.list_collection_names()
    print(f"\n{len(collections)} collections to migrate\n", flush=True)
    
    total = 0
    for coll_name in sorted(collections):
        docs = list(local_db[coll_name].find({}))
        count = len(docs)
        if count > 0:
            atlas_db[coll_name].drop()
            for i in range(0, count, 500):
                atlas_db[coll_name].insert_many(docs[i:i+500])
            total += count
            print(f"  OK  {coll_name}: {count}", flush=True)
        else:
            print(f"  --  {coll_name}: empty", flush=True)
    
    print(f"\nDONE! {total} docs migrated", flush=True)
    local.close()
    atlas.close()

if __name__ == "__main__":
    main()
