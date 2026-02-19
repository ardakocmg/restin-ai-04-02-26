"""Quick user check script"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv('.env')

async def check():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'restin_v2')]
    users = await db.users.find({}, {
        'name': 1, 'email': 1, 'role': 1, 'global_role': 1, 'pin_hash': 1
    }).to_list(None)
    print(f"\nTotal users: {len(users)}")
    print("-" * 80)
    for u in users:
        ph = u.get('pin_hash', '')
        name = u.get('name', '?')
        role = u.get('role', '?')
        gr = u.get('global_role', '?')
        print(f"  {name:30s} | role={role:15s} | global_role={gr}")
        if ph:
            print(f"    pin_hash: {ph[:30]}...")

asyncio.run(check())
