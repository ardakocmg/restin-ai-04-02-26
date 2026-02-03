"""
Seed floor plans for Caviar & Bull
Creates 7 Lightspeed-style floor plan scenarios
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

async def seed_floor_plans():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Find Caviar & Bull venue
    caviar_bull = await db.venues.find_one({"name": "Caviar & Bull"}, {"_id": 0})
    if not caviar_bull:
        print("❌ Caviar & Bull venue not found")
        return
    
    venue_id = caviar_bull["id"]
    print(f"✓ Found Caviar & Bull: {venue_id}")
    
    # Delete existing floor plans for this venue
    await db.floor_plans.delete_many({"venue_id": venue_id})
    await db.floor_plan_objects.delete_many({})
    print("✓ Cleaned existing floor plans")
    
    # Create 7 floor plan scenarios
    floor_plans = [
        {
            "id": f"fp-cb-floor",
            "venue_id": venue_id,
            "name": "Floor",
            "is_active": True,  # This one is active by default
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"fp-cb-terrace",
            "venue_id": venue_id,
            "name": "Terrace",
            "is_active": False,
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"fp-cb-12pax",
            "venue_id": venue_id,
            "name": "12 pax",
            "is_active": False,
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"fp-cb-events",
            "venue_id": venue_id,
            "name": "Events",
            "is_active": False,
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"fp-cb-anniversary",
            "venue_id": venue_id,
            "name": "Anniversary",
            "is_active": False,
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"fp-cb-group200",
            "venue_id": venue_id,
            "name": "Group 200 Terrace",
            "is_active": False,
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"fp-cb-padel",
            "venue_id": venue_id,
            "name": "Padel Event",
            "is_active": False,
            "background_image_url": None,
            "width": 1920,
            "height": 1080,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.floor_plans.insert_many(floor_plans)
    print(f"✓ Created {len(floor_plans)} floor plans")
    
    # Add sample tables to the "Floor" plan
    floor_plan_id = "fp-cb-floor"
    sample_objects = [
        {
            "id": f"obj-{floor_plan_id}-1",
            "floor_plan_id": floor_plan_id,
            "type": "table",
            "ref_id": None,
            "label": "1",
            "x": 100,
            "y": 100,
            "w": 120,
            "h": 120,
            "rotation": 0,
            "shape": "circle",
            "meta_json": {"seats": 2, "vip": False},
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"obj-{floor_plan_id}-2",
            "floor_plan_id": floor_plan_id,
            "type": "table",
            "ref_id": None,
            "label": "2",
            "x": 250,
            "y": 100,
            "w": 120,
            "h": 120,
            "rotation": 0,
            "shape": "circle",
            "meta_json": {"seats": 2, "vip": False},
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"obj-{floor_plan_id}-3",
            "floor_plan_id": floor_plan_id,
            "type": "table",
            "ref_id": None,
            "label": "3",
            "x": 100,
            "y": 250,
            "w": 180,
            "h": 100,
            "rotation": 0,
            "shape": "rectangle",
            "meta_json": {"seats": 4, "vip": False},
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"obj-{floor_plan_id}-4",
            "floor_plan_id": floor_plan_id,
            "type": "table",
            "ref_id": None,
            "label": "4",
            "x": 300,
            "y": 250,
            "w": 180,
            "h": 100,
            "rotation": 0,
            "shape": "rectangle",
            "meta_json": {"seats": 4, "vip": False},
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": f"obj-{floor_plan_id}-5",
            "floor_plan_id": floor_plan_id,
            "type": "table",
            "ref_id": None,
            "label": "5",
            "x": 100,
            "y": 400,
            "w": 240,
            "h": 120,
            "rotation": 0,
            "shape": "rectangle",
            "meta_json": {"seats": 6, "vip": True},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.floor_plan_objects.insert_many(sample_objects)
    print(f"✓ Added {len(sample_objects)} sample tables to 'Floor' plan")
    
    print("\n✨ Floor plan seeding complete!")
    print(f"   - {len(floor_plans)} floor plans created")
    print(f"   - Active plan: Floor")
    print(f"   - Sample tables added to Floor plan")

if __name__ == "__main__":
    asyncio.run(seed_floor_plans())
