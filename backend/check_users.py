"""Quick DB check script"""
import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", os.getenv("MONGO_URI", ""))

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_URI.split("/")[-1].split("?")[0] if "/" in MONGO_URI else "restin_v2"
    db = client[db_name]
    
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "pin": 1, "pin_hash": 1, "role": 1}).to_list(30)
    
    print(f"\n=== Found {len(users)} users ===")
    for u in users:
        pin = u.get("pin", "N/A")
        pin_hash = str(u.get("pin_hash", "N/A"))[:20]
        print(f"  ID: {u.get('id','?')} | Name: {u.get('name','?')} | PIN: {pin} | Hash: {pin_hash}... | Role: {u.get('role','?')}")
    
    if not users:
        print("  NO USERS IN DATABASE!")
    
    client.close()

asyncio.run(main())
