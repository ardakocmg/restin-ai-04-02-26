import sys
import os
import asyncio
from datetime import datetime, timezone

# Add backend root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from core.database import db
    from core.security import hash_pin
    from models import UserRole
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

async def create_user():
    print("Connecting to DB...")
    # Trigger connection if lazy
    # db is the Database wrapper
    if not db:
        print("DB not initialized")
        return

    # Check for client
    if hasattr(db, "client") and db.client:
        print("Client available")
    else:
        # Some implementations might need explicit connect() if not done at import
        if hasattr(db, "connect"):
            await db.connect()
            
    USER_ID = "test-owner-e2e"
    VENUE_ID = "venue-caviar-bull"
    
    # Check if exists
    existing = await db.users.find_one({"id": USER_ID})
    if existing:
        print(f"User {USER_ID} already exists.")
        return

    user_doc = {
        "id": USER_ID,
        "venue_id": VENUE_ID,
        "name": "E2E Test Owner",
        "role": "OWNER",  # String or Enum value
        "pin_hash": hash_pin("1111"),
        "email": "test-e2e@restin.ai",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "allowed_venue_ids": [VENUE_ID],
        "default_venue_id": VENUE_ID
    }
    
    await db.users.insert_one(user_doc)
    print(f"Created user {USER_ID}")

    # Also make sure venue exists?
    venue = await db.venues.find_one({"id": VENUE_ID})
    if not venue:
        venue_doc = {
            "id": VENUE_ID,
            "name": "Caviar & Bull",
            "currency": "EUR",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.venues.insert_one(venue_doc)
        print(f"Created venue {VENUE_ID}")
    else:
        print(f"Venue {VENUE_ID} exists")

if __name__ == "__main__":
    asyncio.run(create_user())
