"""
Venue Group Service - Manage restaurant groups and multi-venue operations
"""
from typing import Optional, List
from core.database import db
from models.venue import VenueGroup, VenueGroupCreate, generate_slug
from datetime import datetime, timezone

async def create_venue_group(data: VenueGroupCreate) -> VenueGroup:
    """Create a new venue group"""
    # Auto-generate slug if not provided
    slug = data.slug or generate_slug(data.name)
    
    # Check if slug already exists
    existing = await db.venue_groups.find_one({"slug": slug}, {"_id": 0})
    if existing:
        # Add numeric suffix to make it unique
        counter = 1
        while await db.venue_groups.find_one({"slug": f"{slug}-{counter}"}, {"_id": 0}):
            counter += 1
        slug = f"{slug}-{counter}"
    
    group = VenueGroup(
        name=data.name,
        slug=slug,
        owner_id=data.owner_id,
        description=data.description,
        venue_ids=[]
    )
    
    await db.venue_groups.insert_one(group.model_dump())
    return group

async def get_venue_group(group_id: str) -> Optional[VenueGroup]:
    """Get venue group by ID"""
    doc = await db.venue_groups.find_one({"id": group_id}, {"_id": 0})
    return VenueGroup(**doc) if doc else None

async def get_venue_group_by_slug(slug: str) -> Optional[VenueGroup]:
    """Get venue group by slug"""
    doc = await db.venue_groups.find_one({"slug": slug}, {"_id": 0})
    return VenueGroup(**doc) if doc else None

async def list_venue_groups(owner_id: Optional[str] = None) -> List[VenueGroup]:
    """List all venue groups, optionally filtered by owner"""
    query = {"owner_id": owner_id} if owner_id else {}
    docs = await db.venue_groups.find(query, {"_id": 0}).to_list(1000)
    return [VenueGroup(**doc) for doc in docs]

async def add_venue_to_group(group_id: str, venue_id: str) -> bool:
    """Add a venue to a group"""
    result = await db.venue_groups.update_one(
        {"id": group_id},
        {
            "$addToSet": {"venue_ids": venue_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Also update the venue's group_id
    await db.venues.update_one(
        {"id": venue_id},
        {"$set": {"group_id": group_id}}
    )
    
    return result.modified_count > 0

async def remove_venue_from_group(group_id: str, venue_id: str) -> bool:
    """Remove a venue from a group"""
    result = await db.venue_groups.update_one(
        {"id": group_id},
        {
            "$pull": {"venue_ids": venue_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Also remove the venue's group_id
    await db.venues.update_one(
        {"id": venue_id},
        {"$set": {"group_id": None}}
    )
    
    return result.modified_count > 0

async def get_venues_in_group(group_id: str) -> List[dict]:
    """Get all venues in a group"""
    docs = await db.venues.find({"group_id": group_id}, {"_id": 0}).to_list(1000)
    return docs

async def update_venue_slug(venue_id: str, slug: str) -> bool:
    """Update venue slug"""
    result = await db.venues.update_one(
        {"id": venue_id},
        {"$set": {"slug": slug}}
    )
    return result.modified_count > 0
