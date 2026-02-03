"""Enable POS and Inventory feature flags for testing"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def enable_all_features():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db_name = os.environ.get("DB_NAME", "test_database")
    db = client[db_name]
    
    print("🔧 Enabling all feature flags...")
    
    venue = await db.venues.find_one({}, {"_id": 0})
    if not venue:
        print("❌ No venue found")
        return
    
    venue_id = venue["id"]
    
    # Enable all features
    await db.venue_config.update_one(
        {"venue_id": venue_id},
        {"$set": {
            "features.POS_ENABLED": True,
            "features.POS_TABLE_SERVICE_ENABLED": True,
            "features.POS_SEAT_COURSE_ENABLED": True,
            "features.POS_SPLIT_MERGE_ENABLED": True,
            "features.POS_OFFLINE_ENABLED": True,
            "features.POS_CASH_CONTROL_ENABLED": True,
            "features.POS_MULTI_TENDER_ENABLED": True,
            "features.KDS_ENABLED": True,
            "features.KDS_WAIT_TIMES_ENABLED": True,
            "features.KDS_ITEMS_LIST_ENABLED": True,
            "features.DEVICES_PAIRING_ENABLED": True,
            "features.PRICING_PRICEBOOKS_ENABLED": True,
        }},
        upsert=True
    )
    
    print(f"✅ All feature flags enabled for {venue['name']}")
    client.close()

if __name__ == "__main__":
    asyncio.run(enable_all_features())
