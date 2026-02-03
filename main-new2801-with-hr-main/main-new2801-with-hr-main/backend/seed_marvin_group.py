"""
Seed Marvin Gauci Restaurant Group data
Creates venue group and venues for production use
"""
import asyncio
from core.database import db, client
from models.venue import VenueGroup, Venue, generate_slug
from models.auth import User
from models.common import UserRole
from services.auth_service import hash_pin
from datetime import datetime, timezone
import uuid

async def seed_marvin_group():
    """Seed Marvin Gauci Restaurant Group"""
    print("🌱 Seeding Marvin Gauci Restaurant Group...")
    
    # Drop existing data (only for development)
    # await db.venue_groups.delete_many({})
    # await db.venues.delete_many({})
    # await db.users.delete_many({})
    
    # 1. Create Product Owner user (if not exists)
    owner_user = await db.users.find_one({"pin_hash": hash_pin("0000")}, {"_id": 0})
    if not owner_user:
        owner_id = str(uuid.uuid4())
        owner_user = User(
            id=owner_id,
            venue_id="system",  # System-level user
            name="Marvin Gauci",
            pin_hash=hash_pin("0000"),
            role=UserRole.PRODUCT_OWNER,
            email="marvin@marvinrestaurants.com"
        )
        await db.users.insert_one(owner_user.model_dump())
        print(f"✅ Created Product Owner: {owner_user.name}")
    else:
        owner_id = owner_user["id"]
        print(f"✅ Product Owner already exists: {owner_user['name']}")
    
    # 2. Create Venue Group
    group_slug = "marvin"
    existing_group = await db.venue_groups.find_one({"slug": group_slug}, {"_id": 0})
    
    if not existing_group:
        group = VenueGroup(
            id=str(uuid.uuid4()),
            name="Marvin Gauci Group",
            slug=group_slug,
            owner_id=owner_id,
            description="Premium restaurant group in Malta specializing in fine dining"
        )
        await db.venue_groups.insert_one(group.model_dump())
        print(f"✅ Created Venue Group: {group.name}")
        group_id = group.id
    else:
        group_id = existing_group["id"]
        group = VenueGroup(**existing_group)
        print(f"✅ Venue Group already exists: {group.name}")
    
    # 3. Create Venues
    venues_data = [
        {
            "name": "Caviar & Bull",
            "location": "St Julians",
            "type": "fine_dining",
            "service_style": "fine_dining"
        },
        {
            "name": "Caviar & Bull",
            "location": "Valletta",
            "type": "fine_dining",
            "service_style": "fine_dining"
        },
        {
            "name": "Tarragon",
            "location": "Marsaxlokk",
            "type": "mediterranean",
            "service_style": "fine_dining"
        }
    ]
    
    venue_ids = []
    for venue_data in venues_data:
        # Generate slug: caviar-bull-st-julians, caviar-bull-valletta, tarragon
        if venue_data["location"]:
            slug_base = f"{generate_slug(venue_data['name'])}-{generate_slug(venue_data['location'])}"
        else:
            slug_base = generate_slug(venue_data['name'])
        
        # Check if venue already exists
        existing_venue = await db.venues.find_one({"slug": slug_base}, {"_id": 0})
        
        if not existing_venue:
            venue = Venue(
                id=str(uuid.uuid4()),
                name=venue_data["name"],
                location=venue_data["location"],
                type=venue_data["type"],
                service_style=venue_data["service_style"],
                timezone="Europe/Malta",
                currency="EUR",
                currency_symbol="€",
                group_id=group_id,
                slug=slug_base
            )
            await db.venues.insert_one(venue.model_dump())
            venue_ids.append(venue.id)
            print(f"✅ Created Venue: {venue.name} - {venue.location} (slug: {venue.slug})")
        else:
            venue_ids.append(existing_venue["id"])
            # Update group_id if needed
            await db.venues.update_one(
                {"id": existing_venue["id"]},
                {"$set": {"group_id": group_id}}
            )
            print(f"✅ Venue already exists: {existing_venue['name']} - {existing_venue.get('location', 'N/A')}")
    
    # 4. Update venue group with venue IDs
    await db.venue_groups.update_one(
        {"id": group_id},
        {"$set": {"venue_ids": venue_ids, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    print(f"\n🎉 Marvin Gauci Group seed complete!")
    print(f"   - Group: {group.name} (slug: {group.slug})")
    print(f"   - Venues: {len(venue_ids)}")
    print(f"\n📝 Subdomain examples:")
    for venue_data in venues_data:
        if venue_data["location"]:
            slug = f"{generate_slug(venue_data['name'])}-{generate_slug(venue_data['location'])}"
        else:
            slug = generate_slug(venue_data['name'])
        print(f"   - {slug}-admin.hospitality-os-5.preview.emergentagent.com")
        print(f"   - {slug}-pos.hospitality-os-5.preview.emergentagent.com")
        print(f"   - {slug}-accounting.hospitality-os-5.preview.emergentagent.com")

if __name__ == "__main__":
    asyncio.run(seed_marvin_group())
