import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os, hashlib
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'restinai')]

async def check():
    pin_hash = hashlib.sha256('0000'.encode()).hexdigest()
    users = await db.users.find({'pin_hash': pin_hash}).to_list(100)
    print(f"Users with PIN 0000 ({len(users)} found):")
    for u in users:
        print(f"  name={u.get('name')} | role={u.get('role')} | id={u.get('id')}")

    # Also check product_owner role
    po = await db.users.find({'role': 'product_owner'}).to_list(10)
    print(f"\nProduct owners ({len(po)} found):")
    for u in po:
        print(f"  name={u.get('name')} | pin_hash exists={bool(u.get('pin_hash'))}")

asyncio.run(check())
