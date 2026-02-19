import asyncio, hashlib
from motor.motor_asyncio import AsyncIOMotorClient

def compute_pin_index(pin):
    return hashlib.sha256(f"restin:pin:{pin}".encode()).hexdigest()

async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["restin_v2"]
    new_pin = "7777"
    r = await db.users.update_one(
        {"name": "Arda Koc", "role": "brand_manager"},
        {"$set": {
            "pin": new_pin,
            "pin_hash": hashlib.sha256(new_pin.encode()).hexdigest(),
            "pin_index": compute_pin_index(new_pin),
        }}
    )
    print(f"Updated brand_manager PIN to {new_pin}: modified={r.modified_count}")
    
    # Check who else has 7777
    idx = compute_pin_index("7777")
    others = await db.users.find({"pin_index": idx}, {"_id":0, "name":1, "role":1}).to_list(20)
    print(f"\nUsers with PIN 7777:")
    for u in others:
        print(f"  {u['name']:30s} role={u['role']}")

asyncio.run(main())
