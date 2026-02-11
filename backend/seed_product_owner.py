# Seed Product Owner - Arda Koc
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

async def seed_product_owner():
    print("Creating Product Owner - Arda Koc...")
    
    # Check if already exists
    existing = await db.users.find_one({"role": "product_owner"})
    if existing:
        print("[OK] Product Owner already exists")
        return
    
    product_owner = {
        "id": "user-product-owner-arda",
        "display_id": "EMP-00000",  # Special ID
        "venue_id": "venue-caviar-bull",
        "name": "Arda Koc",
        "pin_hash": hash_pin("0000"),  # PIN: 0000
        "role": "product_owner",
        "email": "arda.koc@emergentagent.com",
        "mfa_enabled": False,
        "allowed_venue_ids": [],  # All venues (checked in code)
        "immutable": True,
        "cannot_delete": True,
        "cannot_change_role": True,
        "created_at": "2026-01-01T00:00:00Z"
    }
    
    await db.users.insert_one(product_owner)
    print("[OK] Product Owner created")
    print("  Name: Arda Koc")
    print("  PIN: 0000")
    print("  Role: PRODUCT_OWNER (immutable)")
    print("  Email: arda.koc@emergentagent.com")

if __name__ == "__main__":
    asyncio.run(seed_product_owner())
