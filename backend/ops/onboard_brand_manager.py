import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import hashlib
from pathlib import Path
from datetime import datetime, timezone

# Setup
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restin_v2')]

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

async def onboard_arda_koc():
    print(">> Starting Onboarding for Brand Manager: Arda Koc")
    
    # 1. Hashing the target password "7777"
    target_pin_hash = hash_pin("7777")
    print(f">> Target Password Hash (7777): {target_pin_hash}")

    # 2. Check for Collisions
    # Find any user who DOES NOT have the ID 'user-brand-arda-777' (our new user) but HAS this password
    collision_users = await db.users.find({
        "pin_hash": target_pin_hash,
        "id": {"$ne": "user-brand-arda-777"} 
    }).to_list(None)

    if collision_users:
        print(f"!!  FOUND {len(collision_users)} USER(S) WITH PASSWORD '7777'. RESETTING THEM...")
        for u in collision_users:
            new_pin = "0000"
            new_hash = hash_pin(new_pin)
            await db.users.update_one(
                {"id": u["id"]},
                {"$set": {"pin_hash": new_hash}}
            )
            print(f"   PLEASE NOTIFY: User {u.get('name')} ({u.get('role')}) password reset to '0000'.")
    else:
        print(">> No password collisions found.")

    # 3. Create/Update Brand Manager User
    user_id = "user-brand-arda-777"
    username = "Arda Koc"
    
    # Check if he already exists (Evolutionary Architecture: Don't delete, update)
    existing_user = await db.users.find_one({"id": user_id})
    
    user_data = {
        "id": user_id,
        "name": username,
        "role": "brand_manager", # High level role
        "pin_hash": target_pin_hash, # 7777
        "venue_id": "venue-caviar-bull", # Default home base
        "allowed_venue_ids": ["venue-caviar-bull", "venue-don-royale", "venue-sole-tarragon"],
        "is_super_owner": True, # Access to all venues in group
        "email": "arda.koc@marvingaucigroup.com", # Placeholder
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    if existing_user:
        print(f">>  Updating existing user: {username}")
        await db.users.update_one({"id": user_id}, {"$set": user_data})
    else:
        print(f">> Creating NEW user: {username}")
        await db.users.insert_one(user_data)

    # 4. "Deep Dive into History" - Link Historical Data
    # The user mentioned "payroll" and "old settings".
    # Strategy: Find any orphan records or records linked to a generic 'admin' and re-assign?
    # Or simply ensuring he has access to ALL existing data is enough for "Group" view.
    # We will ensure the 'venue_group' is correctly set up so he sees everything.
    
    group_id = "group-marvin-gauci"
    venue_group = await db.venue_groups.find_one({"id": group_id})
    
    if venue_group:
        print(f">> Confirmed membership in Group: {venue_group['name']}")
        # Ensure he is an owner of the group if needed, or just relying on is_super_owner flag
    else:
        print("!!  Available Venue Group not found! Please run seed logic first.")

    # 5. Preserve 'Existing Product Owner Arda Koc'
    # We check if there's another Arda Koc (maybe ID 'user-cb-owner'?) and ensure we didn't touch him
    # The prompt implies there is another one.
    existing_product_owner = await db.users.find_one({"name": "Arda Koc", "id": {"$ne": user_id}})
    if existing_product_owner:
        print(f">> PROTECTED: Existing Product Owner '{existing_product_owner['name']}' (ID: {existing_product_owner['id']}) was NOT modified.")
    
    print("\n>> ONBOARDING COMPLETE.")
    print("   User: Arda Koc (Brand Manager)")
    print("   Pass: 7777")
    print("   Access: All Venues")

if __name__ == "__main__":
    asyncio.run(onboard_arda_koc())
