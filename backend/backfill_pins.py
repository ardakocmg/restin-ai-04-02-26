"""
PIN Backfill v2 - Uses SHA256 matching (not bcrypt) + raw pin field
"""
import asyncio
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient

def compute_pin_index(pin: str) -> str:
    return hashlib.sha256(f"restin:pin:{pin}".encode()).hexdigest()

def sha256_hash(val: str) -> str:
    return hashlib.sha256(val.encode()).hexdigest()

async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["restin_v2"]
    
    users = await db.users.find(
        {"$or": [
            {"pin_hash": {"$exists": True, "$ne": None}},
            {"pin": {"$exists": True, "$ne": None}},
        ]},
        {"_id": 0, "id": 1, "name": 1, "pin_hash": 1, "pin": 1, "pin_index": 1}
    ).to_list(200)
    
    print(f"Users with pin_hash or pin field: {len(users)}")
    
    backfilled = 0
    already = 0
    failed = 0
    
    for u in users:
        name = u.get("name", "?")
        user_id = u["id"]
        
        # Skip if already has pin_index
        if u.get("pin_index"):
            already += 1
            continue
        
        raw_pin = u.get("pin")
        pin_hash = u.get("pin_hash")
        found_pin = None
        
        # Method 1: Use raw pin field if available
        if raw_pin:
            found_pin = str(raw_pin)
        
        # Method 2: Try SHA256 match for 4-digit PINs
        if not found_pin and pin_hash:
            for i in range(10000):
                candidate = f"{i:04d}"
                if sha256_hash(candidate) == pin_hash:
                    found_pin = candidate
                    break
        
        if found_pin:
            idx = compute_pin_index(found_pin)
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"pin_index": idx}}
            )
            backfilled += 1
            print(f"  OK: {name:30s} PIN={found_pin} -> index set")
        else:
            failed += 1
            print(f"  FAIL: {name:30s} (no raw pin, hash not matching 0000-9999)")
    
    print(f"\nResults: {backfilled} backfilled, {already} already had index, {failed} failed")

asyncio.run(main())
