"""
Venue Group Routes - Manage restaurant groups and multi-venue operations
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from models.venue import VenueGroup, VenueGroupCreate, Venue
from services.venue_group_service import (
    create_venue_group,
    get_venue_group,
    get_venue_group_by_slug,
    list_venue_groups,
    add_venue_to_group,
    remove_venue_from_group,
    get_venues_in_group,
    update_venue_slug
)
from core.subdomain import get_subdomain_context, SubdomainContext
from core.dependencies import get_current_user
from models.auth import User
from core.database import db

def create_venue_group_router():
    router = APIRouter(prefix="/venue-groups", tags=["venue-groups"])
    
    @router.post("/", response_model=VenueGroup)
    async def create_group(data: VenueGroupCreate, current_user: User = Depends(get_current_user)):
        """Create a new venue group"""
        return await create_venue_group(data)
    
    @router.get("/", response_model=List[VenueGroup])
    async def list_groups(owner_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
        """List all venue groups"""
        return await list_venue_groups(owner_id)
    
    @router.get("/{group_id}", response_model=VenueGroup)
    async def get_group(group_id: str, current_user: User = Depends(get_current_user)):
        """Get a specific venue group"""
        group = await get_venue_group(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Venue group not found")
        return group
    
    @router.get("/slug/{slug}", response_model=VenueGroup)
    async def get_group_by_slug(slug: str, current_user: User = Depends(get_current_user)):
        """Get a venue group by slug"""
        group = await get_venue_group_by_slug(slug)
        if not group:
            raise HTTPException(status_code=404, detail="Venue group not found")
        return group
    
    @router.post("/{group_id}/venues/{venue_id}")
    async def add_venue(group_id: str, venue_id: str, current_user: User = Depends(get_current_user)):
        """Add a venue to a group"""
        success = await add_venue_to_group(group_id, venue_id)
        if not success:
            raise HTTPException(status_code=404, detail="Failed to add venue to group")
        return {"status": "success"}
    
    @router.delete("/{group_id}/venues/{venue_id}")
    async def remove_venue(group_id: str, venue_id: str, current_user: User = Depends(get_current_user)):
        """Remove a venue from a group"""
        success = await remove_venue_from_group(group_id, venue_id)
        if not success:
            raise HTTPException(status_code=404, detail="Failed to remove venue from group")
        return {"status": "success"}
    
    @router.get("/{group_id}/venues", response_model=List[dict])
    async def get_group_venues(group_id: str, current_user: User = Depends(get_current_user)):
        """Get all venues in a group"""
        return await get_venues_in_group(group_id)
    
    @router.get("/context/current")
    async def get_current_context(request: Request, current_user: User = Depends(get_current_user)):
        """Get current subdomain context"""
        context = get_subdomain_context(request)
        
        result = {
            "is_subdomain": context.is_subdomain,
            "venue_slug": context.venue_slug,
            "module": context.module,
            "raw_host": context.raw_host
        }
        
        # If subdomain is present, fetch venue details
        if context.venue_slug:
            venue = await db.venues.find_one({"slug": context.venue_slug}, {"_id": 0})
            if venue:
                result["venue"] = venue
                
                # Fetch group details if venue has group_id
                if venue.get("group_id"):
                    group = await db.venue_groups.find_one({"id": venue["group_id"]}, {"_id": 0})
                    if group:
                        result["group"] = group
        
        return result
    
    return router
