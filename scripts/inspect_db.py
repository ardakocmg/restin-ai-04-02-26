import asyncio
import os
# Ensure app context
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Minimal mongo client
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.restin_v2
    
    print("\n--- Nuki Credentials ---")
    creds = await db.nuki_credentials.find({}).to_list(100)
    for c in creds:
        print(f"Venue: {c.get('venue_id')}")
        print(f"Mode: {c.get('mode')}")
        print(f"Status: {c.get('status')}")
        print(f"Encrypted Token: {c.get('encrypted_api_token')}")
        print("-" * 20)

    print("\n--- Doors ---")
    doors = await db.doors.find({}).to_list(100)
    print(f"Found {len(doors)} doors.")
    for d in doors:
        print(f"{d.get('display_name')} ({d.get('id')})")

if __name__ == "__main__":
    asyncio.run(main())
