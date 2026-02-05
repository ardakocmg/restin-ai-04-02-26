from .config import MONGO_URL
from .mock_database import MockDatabase, MockClient

# Try to import MongoDatabase, but be safe if file issue
try:
    from .mongo_database import MongoDatabase
except ImportError:
    MongoDatabase = None

db = None
client = None

if MONGO_URL and MongoDatabase:
    print(f"[OK] Connecting to MongoDB at {MONGO_URL}...")
    try:
        db = MongoDatabase()
        client = db.client
        # We need to initialize it async, but this is module level.
        # Ideally, we call db.initialize() in server.py startup event.
    except Exception as e:
        print(f"[ERROR] Failed to connect to MongoDB: {e}")
        print("WARNING: Falling back to Mock Database")
        db = MockDatabase()
        client = MockClient(db)
else:
    print("WARNING: Using Mock Database (MONGO_URL not set)")
    db = MockDatabase()
    client = MockClient(db)

def get_database():
    """Return database instance"""
    return db
