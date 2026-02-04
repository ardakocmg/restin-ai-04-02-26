import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

async def seed_guests_and_reservations():
    print("Seeding guests and reservations...")
    
    venue_id = "venue-caviar-bull"
    
    # Sample guests
    guests_data = [
        {
            "id": "guest-john-doe",
            "venue_id": venue_id,
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+356 9999 1234",
            "tags": ["VIP", "Wine Lover"],
            "preferences": "Prefers window seats, allergic to shellfish",
            "allergens": ["shellfish"],
            "visit_count": 12,
            "total_spend": 2450.00,
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "guest-sarah-smith",
            "venue_id": venue_id,
            "name": "Sarah Smith",
            "email": "sarah.smith@example.com",
            "phone": "+356 9999 5678",
            "tags": ["Birthday", "Regular"],
            "preferences": "Vegetarian, loves desserts",
            "allergens": [],
            "visit_count": 8,
            "total_spend": 1200.00,
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "guest-david-brown",
            "venue_id": venue_id,
            "name": "David Brown",
            "email": "david.brown@example.com",
            "phone": "+356 9999 9012",
            "tags": ["Corporate"],
            "preferences": "Usually books for 6-8 people, prefers private area",
            "allergens": ["gluten"],
            "visit_count": 5,
            "total_spend": 3500.00,
            "last_visit": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.guests.delete_many({"venue_id": venue_id})
    await db.guests.insert_many(guests_data)
    print(f"✓ Created {len(guests_data)} guests")
    
    # Sample reservations for today and tomorrow
    today = datetime.now(timezone.utc)
    tomorrow = today + timedelta(days=1)
    
    reservations_data = [
        {
            "id": "res-001",
            "venue_id": venue_id,
            "guest_id": "guest-john-doe",
            "guest_name": "John Doe",
            "date": today.strftime("%Y-%m-%d"),
            "time": "19:00",
            "party_size": 2,
            "table_id": "table-1",
            "status": "confirmed",
            "special_requests": "Window seat please",
            "source": "phone",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "res-002",
            "venue_id": venue_id,
            "guest_id": "guest-sarah-smith",
            "guest_name": "Sarah Smith",
            "date": today.strftime("%Y-%m-%d"),
            "time": "20:00",
            "party_size": 4,
            "table_id": "table-5",
            "status": "confirmed",
            "special_requests": "Birthday celebration",
            "source": "online",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "res-003",
            "venue_id": venue_id,
            "guest_id": "guest-david-brown",
            "guest_name": "David Brown",
            "date": tomorrow.strftime("%Y-%m-%d"),
            "time": "19:30",
            "party_size": 8,
            "table_id": None,
            "status": "pending",
            "special_requests": "Private dining area",
            "source": "phone",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.reservations.delete_many({"venue_id": venue_id})
    await db.reservations.insert_many(reservations_data)
    print(f"✓ Created {len(reservations_data)} reservations")
    
    print("✓ Guest and reservation seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_guests_and_reservations())
