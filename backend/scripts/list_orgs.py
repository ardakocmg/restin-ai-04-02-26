
import os
import pymongo
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

MONGO_URL = os.environ.get("DATABASE_URL")
if not MONGO_URL:
    print("DATABASE_URL missing")
    exit(1)

client = pymongo.MongoClient(MONGO_URL)
db = client.get_default_database()

orgs = list(db.organizations.find({}, {"_id": 1, "name": 1}))
print(f"Found {len(orgs)} organizations:")
for o in orgs:
    print(f" - {o['_id']}: {o.get('name')}")
client.close()
