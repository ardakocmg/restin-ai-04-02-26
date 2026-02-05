import asyncio
from core.mongo_database import MongoDatabase
import json

async def check():
    try:
        db = MongoDatabase()
        await db.initialize()
        
        print("--- DEVICES ---")
        async for dev in db.devices.find({}):
            print(f"ID: {dev.get('id')}, Name: {dev.get('name')}, Status: {dev.get('status')}, LastSeen: {dev.get('last_heartbeat')}")
            
        print("\n--- INVENTORY ---")
        async for item in db.inventory_items.find({}):
            print(f"Item: {item.get('name')}, SKU: {item.get('sku')}, Stock: {item.get('current_stock')}")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if 'db' in locals() and hasattr(db, 'client'):
            db.client.close()

if __name__ == "__main__":
    asyncio.run(check())
