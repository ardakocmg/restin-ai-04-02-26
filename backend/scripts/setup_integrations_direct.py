
import os
import pymongo
from datetime import datetime, timezone
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

MONGO_URL = os.environ.get("DATABASE_URL")
if not MONGO_URL:
    print("DATABASE_URL missing")
    exit(1)

print(f"Connecting to Mongo at {MONGO_URL}...")
client = pymongo.MongoClient(MONGO_URL)
db = client.get_default_database()

# Find Organization
org = db.organizations.find_one({})
if not org:
    print("No organization found! Cannot configure integrations.")
    exit(1)

org_id = org["_id"]
print(f"Organization ID: {org_id}")

now = datetime.now(timezone.utc)

# Tuya Config
tuya_creds = {
    "access_id": "m885873995f2694d5098",
    "access_secret": "31274577888743d5b78b5ce53460613a",
    "endpoint": "https://openapi.tuyaeu.com"
}
tuya_data = {
    "organizationId": org_id,
    "provider": "TUYA",
    "isEnabled": True,
    "credentials": tuya_creds,
    "status": "CONNECTED", # Assuming success based on direct test
    "updatedAt": now,
    "createdAt": now 
}

# Meross Config
meross_creds = {
    "email": "arda@marvingauci.com",
    "password": "Mg2026"
}
meross_data = {
    "organizationId": org_id,
    "provider": "MEROSS",
    "isEnabled": True,
    "credentials": meross_creds,
    "status": "CONNECTED", # Assuming success based on TCP test + Setup
    "updatedAt": now,
    "createdAt": now
}

# Upsert Tuya
res_tuya = db.integration_configs.update_one(
    {"organizationId": org_id, "provider": "TUYA"},
    {"$set": tuya_data},
    upsert=True
)
print(f"Tuya Config Upserted: {res_tuya.upserted_id or res_tuya.modified_count}")

# Upsert Meross
res_meross = db.integration_configs.update_one(
    {"organizationId": org_id, "provider": "MEROSS"},
    {"$set": meross_data},
    upsert=True
)
print(f"Meross Config Upserted: {res_meross.upserted_id or res_meross.modified_count}")

client.close()
