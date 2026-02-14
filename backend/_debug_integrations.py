"""Quick debug script to check integration_configs collection"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

async def main():
    from core.config import MONGO_URL, DB_NAME
    from motor.motor_asyncio import AsyncIOMotorClient
    
    print(f"Connecting to: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Check integration_configs
    count = await db.integration_configs.count_documents({})
    print(f"\n=== integration_configs: {count} documents ===")
    async for doc in db.integration_configs.find({}):
        doc_id = str(doc.get("_id", "N/A"))
        provider = doc.get("provider", "UNKNOWN")
        status = doc.get("status", "N/A")
        enabled = doc.get("isEnabled", "N/A")
        venue = doc.get("venueId", "N/A")
        org = doc.get("organizationId", "N/A")
        creds_keys = list(doc.get("credentials", {}).keys())
        print(f"  [{provider}] status={status} enabled={enabled} venue={venue} org={org} creds={creds_keys}")
    
    # Check doors
    door_count = await db.doors.count_documents({})
    print(f"\n=== doors: {door_count} documents ===")
    async for doc in db.doors.find({}):
        name = doc.get("name", "N/A")
        nuki_id = doc.get("nuki_smartlock_id", "N/A")
        print(f"  [{name}] nuki_id={nuki_id}")
    
    # Check google_settings
    gs_count = await db.google_settings.count_documents({})
    print(f"\n=== google_settings: {gs_count} documents ===")
    async for doc in db.google_settings.find({}):
        print(f"  {doc}")
    
    client.close()

asyncio.run(main())
