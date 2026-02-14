"""Check restin_v2 integration_configs directly"""
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")

# Check both databases
for db_name in ["restin_ai", "restin_v2"]:
    db = client[db_name]
    count = db.integration_configs.count_documents({})
    print(f"\n{db_name}.integration_configs: {count} documents")
    for doc in db.integration_configs.find({}, {"_id": 0, "credentials": 0}):
        print(f"  - provider={doc.get('provider')}, isEnabled={doc.get('isEnabled')}, status={doc.get('status')}")

# Also check what collections exist in restin_v2
print(f"\nCollections in restin_v2:")
for col in client["restin_v2"].list_collection_names():
    print(f"  - {col}")

client.close()
