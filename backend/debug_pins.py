import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

async def main():
    db = AsyncIOMotorClient("mongodb://localhost:27017")["restin_v2"]
    
    # Get a sample of users with pin_hash
    users = await db.users.find(
        {"pin_hash": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "name": 1, "pin_hash": 1, "employee_id": 1, "pin": 1, "raw_pin": 1}
    ).to_list(5)
    
    for u in users:
        print(f"Name: {u.get('name')}")
        print(f"  employee_id: {u.get('employee_id', 'N/A')}")
        print(f"  pin (raw): {u.get('pin', 'N/A')}")
        print(f"  raw_pin: {u.get('raw_pin', 'N/A')}")
        print(f"  pin_hash: {u.get('pin_hash', 'N/A')[:60]}...")
        
        # Try their employee_id as PIN
        eid = u.get("employee_id")
        if eid:
            try:
                match = bcrypt.checkpw(str(eid).encode(), u["pin_hash"].encode())
                print(f"  employee_id '{eid}' as PIN: {'MATCH!' if match else 'no match'}")
            except Exception as e:
                print(f"  employee_id check error: {e}")
        
        # Check if there's a raw pin field
        raw = u.get("pin") or u.get("raw_pin")
        if raw:
            try:
                match = bcrypt.checkpw(str(raw).encode(), u["pin_hash"].encode())
                print(f"  raw pin '{raw}' as PIN: {'MATCH!' if match else 'no match'}")
            except Exception as e:
                print(f"  raw pin check error: {e}")
        print()
    
    # Also check all fields on first user to find any pin-related fields
    first = await db.users.find_one({"pin_hash": {"$exists": True}}, {"_id": 0})
    if first:
        print("ALL FIELDS on first user:")
        for k in sorted(first.keys()):
            v = first[k]
            if isinstance(v, str) and len(v) > 80:
                v = v[:80] + "..."
            print(f"  {k}: {v}")

asyncio.run(main())
