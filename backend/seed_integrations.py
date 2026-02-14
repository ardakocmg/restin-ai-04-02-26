"""Seed integrations into MongoDB ATLAS (the actual database used by the backend)"""
import pymongo
from datetime import datetime, timezone

# Connect to the REAL database (MongoDB Atlas)
ATLAS_URI = "mongodb+srv://restinai:eGYK4wDzrOSxMHkz@cluster0.5ndlsdd.mongodb.net/restin_v2?retryWrites=true&w=majority&appName=Cluster0"
client = pymongo.MongoClient(ATLAS_URI)
db = client["restin_v2"]

now = datetime.now(timezone.utc)

integrations = [
    {
        "provider": "TUYA",
        "isEnabled": True,
        "status": "CONNECTED",
        "credentials": {
            "access_id": "m885873995f2694d5098",
            "access_key": "31274577888743d5b78b5ce53460613a",
            "endpoint": "https://openapi.tuyaeu.com"
        },
    },
    {
        "provider": "MEROSS",
        "isEnabled": True,
        "status": "CONNECTED",
        "credentials": {
            "email": "arda@marvingauci.com",
            "password": "Mg2026",
            "api_base": "https://iotx-eu.meross.com"
        },
    },
    {
        "provider": "STRIPE",
        "isEnabled": False,
        "status": "DISABLED",
        "credentials": {
            "api_key": "sk_test_placeholder",
            "publishable_key": "pk_test_placeholder"
        },
    },
    {
        "provider": "OPENAI",
        "isEnabled": True,
        "status": "CONNECTED",
        "credentials": {
            "api_key": "sk-placeholder"
        },
    },
]

print(f"Seeding {len(integrations)} integrations into ATLAS restin_v2.integration_configs...")

for item in integrations:
    item["createdAt"] = now
    item["updatedAt"] = now
    result = db.integration_configs.update_one(
        {"provider": item["provider"]},
        {"$set": item},
        upsert=True
    )
    status = "inserted" if result.upserted_id else f"updated ({result.modified_count})"
    print(f"  [OK] {item['provider']}: {status}")

# Verify
count = db.integration_configs.count_documents({})
print(f"\nTotal integration_configs in Atlas: {count}")
for doc in db.integration_configs.find({}, {"_id": 0, "credentials": 0}):
    print(f"  - {doc['provider']}: isEnabled={doc.get('isEnabled')}, status={doc.get('status')}")

client.close()
print("\n[DONE] Seeded into Atlas!")
