"""Debug script to check PIN 0000 users in database"""
import asyncio
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["restin_v2"]
    
    # Check what hash_pin produces
    pin_hash = hashlib.sha256("0000".encode()).hexdigest()
    print(f"PIN hash for 0000: {pin_hash}")
    
    # Find all users with this pin_hash
    users = await db.users.find(
        {"pin_hash": pin_hash},
        {"_id": 0, "name": 1, "role": 1, "id": 1}
    ).to_list(20)
    
    print(f"\nFound {len(users)} users with PIN 0000:")
    for u in users:
        print(f"  - {u.get('name', 'N/A')} | role={u.get('role', 'N/A')} | id={u.get('id', 'N/A')}")
    
    # Sort them like auth code does
    role_sort_map = {
        "product_owner": 0, "owner": 1, "general_manager": 2,
        "manager": 3, "staff": 4
    }
    users.sort(key=lambda u: role_sort_map.get(u.get("role", "staff"), 5))
    print(f"\nAfter role-priority sort (winner = first):")
    for u in users:
        print(f"  - {u.get('name', 'N/A')} | role={u.get('role', 'N/A')}")
    
    if users:
        print(f"\n>>> WINNER: {users[0].get('name')} ({users[0].get('role')})")
    
    # Also show Arda Koc specifically
    arda = await db.users.find_one(
        {"name": {"$regex": "arda", "$options": "i"}},
        {"_id": 0, "name": 1, "role": 1, "id": 1, "pin_hash": 1}
    )
    if arda:
        print(f"\n--- Arda's record ---")
        print(f"  Name: {arda.get('name')}")
        print(f"  Role: {arda.get('role')}")
        print(f"  PIN hash: {arda.get('pin_hash')}")
        print(f"  PIN hash matches 0000: {arda.get('pin_hash') == pin_hash}")
    else:
        print("\n--- Arda not found in DB ---")

    client.close()

asyncio.run(check())
