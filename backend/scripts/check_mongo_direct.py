
import os
import pymongo
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

MONGO_URL = os.environ.get("DATABASE_URL")
print(f"Loading env from: {os.path.abspath(env_path)}")
if not MONGO_URL:
    print("DATABASE_URL missing")
    exit(1)

print(f"Connecting to Mongo...")
client = pymongo.MongoClient(MONGO_URL)
db = client.get_default_database()

print(f"DB: {db.name}")

configs = list(db["integration_configs"].find({}))
print(f"Found {len(configs)} configs:")
for c in configs:
    # Handle different field names if mapped or raw
    provider = c.get("provider", "UNKNOWN")
    status = c.get("status", "UNKNOWN")
    print(f" - {provider}: {status}")

client.close()
