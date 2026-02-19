"""Seed script for KDS system - creates stations, settings, and test data"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def seed_kds():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db_name = os.environ.get("DB_NAME", "restin_v2")
    db = client[db_name]
    
    print("ğŸ”§ Seeding KDS System...")
    print(f"ğŸ“Š Database: {db_name}")
    
    # Get first venue
    venue = await db.venues.find_one({}, {"_id": 0})
    if not venue:
        print("âŒ No venue found. Please run venue seed first.")
        return
    
    venue_id = venue["id"]
    print(f"âœ… Using venue: {venue['name']} ({venue_id})")
    
    # Enable KDS feature flags
    await db.venue_configs.update_one(
        {"venue_id": venue_id},
        {"$set": {
            "features.KDS_ENABLED": True,
            "features.KDS_WAIT_TIMES_ENABLED": True,
            "features.KDS_ITEMS_LIST_ENABLED": True,
            "features.DEVICES_PAIRING_ENABLED": True,
            "features.PRICING_PRICEBOOKS_ENABLED": True,
        }},
        upsert=True
    )
    print("âœ… Feature flags enabled")
    
    # Create KDS stations
    stations = [
        {
            "id": "st_grill_001",
            "venue_id": venue_id,
            "station_key": "GRILL",
            "name": "Grill Station",
            "enabled": True,
            "routing_rules": [
                {"type": "category", "values": ["Steaks", "Burgers", "BBQ"]}
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "system"
        },
        {
            "id": "st_cold_001",
            "venue_id": venue_id,
            "station_key": "COLD",
            "name": "Cold Station",
            "enabled": True,
            "routing_rules": [
                {"type": "category", "values": ["Salads", "Appetizers", "Desserts"]}
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "system"
        },
        {
            "id": "st_fry_001",
            "venue_id": venue_id,
            "station_key": "FRY",
            "name": "Fry Station",
            "enabled": True,
            "routing_rules": [
                {"type": "category", "values": ["Sides", "Fried"]}
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "system"
        },
        {
            "id": "st_kitchen_001",
            "venue_id": venue_id,
            "station_key": "KITCHEN",
            "name": "Main Kitchen",
            "enabled": True,
            "routing_rules": [],  # Default catchall
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "system",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "system"
        }
    ]
    
    for station in stations:
        await db.kds_stations.update_one(
            {"station_key": station["station_key"], "venue_id": venue_id},
            {"$set": station},
            upsert=True
        )
    print(f"âœ… Created {len(stations)} KDS stations")
    
    # Create default station settings
    for station in stations:
        settings = {
            "station_key": station["station_key"],
            "venue_id": venue_id,
            "ticket_summary": {
                "customer": True,
                "order_id": True,
                "covers": True,
                "server": True,
                "type": True,
                "floor": False,
                "order_source": True,
                "pickup_time": False,
                "view": "FULL"
            },
            "order_status_enabled": {
                "new": True,
                "preparing": True,
                "ready_to_collect": True,
                "on_hold": True,
                "completed": True
            },
            "theme": "LIGHT",
            "layout": "EQUAL",
            "language": "en",
            "time_format": "24H",
            "wait_times": {
                "enabled": True,
                "delayed_after_min": 10,
                "late_after_min": 20
            },
            "coursing": "SINGLE"
        }
        
        await db.kds_station_settings.update_one(
            {"station_key": station["station_key"], "venue_id": venue_id},
            {"$set": settings},
            upsert=True
        )
    print(f"âœ… Created settings for {len(stations)} stations")
    
    # Create a test device
    device = {
        "id": "dev_kds_001",
        "venue_id": venue_id,
        "type": "KDS_SCREEN",
        "name": "Grill Station Display",
        "ip_address": "192.168.1.100",
        "user_agent_hash": None,
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
        "trusted": True,
        "tags": ["grill", "main_kitchen"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": "system"
    }
    
    await db.devices.update_one(
        {"id": device["id"]},
        {"$set": device},
        upsert=True
    )
    print("âœ… Created test device")
    
    # Create a default price book
    price_book = {
        "id": "pb_default_001",
        "venue_id": venue_id,
        "name": "Default Price Book",
        "priority": 100,
        "active": True,
        "channels": [],  # All channels
        "order_types": [],  # All order types
        "valid_from": None,
        "valid_to": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": "system"
    }
    
    await db.price_books.update_one(
        {"id": price_book["id"]},
        {"$set": price_book},
        upsert=True
    )
    print("âœ… Created default price book")
    
    # Create indexes
    await db.kds_stations.create_index([("venue_id", 1), ("station_key", 1)], unique=True)
    await db.kds_ticket_states.create_index([("venue_id", 1), ("station_key", 1), ("status", 1)])
    await db.kds_ticket_states.create_index([("order_id", 1)])
    await db.kds_item_states.create_index([("venue_id", 1), ("station_key", 1), ("status", 1)])
    await db.kds_item_states.create_index([("item_id", 1)])
    await db.devices.create_index([("venue_id", 1), ("type", 1)])
    await db.device_pairing_codes.create_index([("venue_id", 1), ("expires_at", 1)])
    await db.price_books.create_index([("venue_id", 1), ("priority", -1)])
    await db.price_book_items.create_index([("price_book_id", 1), ("item_id", 1)], unique=True)
    await db.rm_kds_item_stats_daily.create_index([("venue_id", 1), ("day", -1), ("station_key", 1)])
    
    print("âœ… Created database indexes")
    
    print("ğŸ‰ KDS System seed complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_kds())
