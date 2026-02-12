"""
Patch script for restin.ai - Stage 2
Safely inject Venue Group and User permissions WITHOUT deleting existing data.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restin_v2')]

async def patch_database():
    print("[PATCH] Patching database with Venue Group configuration...")
    now = datetime.now(timezone.utc).isoformat()

    # 1. Create Venue Group (Upsert)
    group_id = "group-marvin-gauci"
    venue_group = {
        "id": group_id,
        "name": "Marvin Gauci Group",
        "slug": "marvin-gauci-group",
        "owner_id": "user-cb-owner", 
        "venue_ids": ["venue-caviar-bull", "venue-don-royale", "venue-sole-tarragon"],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.venue_groups.update_one(
        {"id": group_id},
        {"$set": venue_group},
        upsert=True
    )
    if result.upserted_id:
        print(f"[OK] Created Venue Group: {venue_group['name']}")
    else:
        print(f"[OK] Updated Venue Group: {venue_group['name']}")

    # 2. Link Venues to Group
    await db.venues.update_many(
        {"id": {"$in": venue_group["venue_ids"]}},
        {"$set": {"group_id": group_id}}
    )
    print(f"[OK] Linked {len(venue_group['venue_ids'])} venues to group {group_id}")

    # 3. Grant Owner Access
    owner_id = "user-cb-owner"
    owner_update = {
        "allowed_venue_ids": ["venue-caviar-bull", "venue-don-royale", "venue-sole-tarragon"],
        "is_super_owner": True
    }
    
    result = await db.users.update_one(
        {"id": owner_id},
        {"$set": owner_update}
    )
    
    if result.modified_count > 0:
        print(f"[OK] Updated permissions for Owner ({owner_id})")
    else:
        print(f"[INFO] Owner permissions already set or user not found.")

    print("\n[DONE] Database patch completed successfully!")

if __name__ == "__main__":
    asyncio.run(patch_database())
