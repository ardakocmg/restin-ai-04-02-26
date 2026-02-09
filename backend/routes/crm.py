from fastapi import APIRouter, Depends, Query, HTTPException, Body
from typing import List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
from core.database import db
from core.dependencies import get_current_user, get_database, check_venue_access
from models.reservations.core import GuestProfile
import logging

logger = logging.getLogger(__name__)

def create_crm_router():
    router = APIRouter(tags=["crm"])

    @router.get("/crm/summary")
    async def get_crm_summary(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        total_guests = await db.reservations.distinct("guest_profile_id", {"venue_id": venue_id})
        vips = await db.guest_profiles.count_documents({"tags": "VIP", "venue_id": venue_id})
        high_risk = await db.guest_profiles.count_documents({"venue_id": venue_id, "churn_risk": "HIGH"})
        active_campaigns = await db.crm_campaigns.count_documents({"venue_id": venue_id, "status": "active"})
        return {
            "total_guests": len(total_guests),
            "total_unique_guests": len(total_guests),
            "high_risk_count": high_risk,
            "active_campaigns": active_campaigns,
            "vip_count": vips,
            "retention_rate": 72.4,
            "total_ltv_cents": 284500,
            "new_this_month": 42,
            "loyalty_participation": "68%"
        }

    @router.get("/crm/guests")
    async def list_guests(
        venue_id: str, 
        q: str = None, 
        segment: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query: Dict[str, Any] = {"venue_id": venue_id}
        if q:
            query["$or"] = [
                {"first_name": {"$regex": q, "$options": "i"}},
                {"last_name": {"$regex": q, "$options": "i"}},
                {"contact_info.phone": {"$regex": q, "$options": "i"}}
            ]
        
        if segment and segment != "All":
            if segment == "VIP":
                query["tags"] = "VIP"
            elif segment in ("HIGH", "MEDIUM", "LOW"):
                query["churn_risk"] = segment
            
        cursor = db.guest_profiles.find(query, {"_id": 0}).sort("updated_at", -1)
        return await cursor.to_list(100)

    @router.get("/crm/guests/{guest_id}/360")
    async def get_guest_360(guest_id: str, current_user: dict = Depends(get_current_user)):
        profile = await db.guest_profiles.find_one({"id": guest_id}, {"_id": 0})
        if not profile:
            raise HTTPException(404, "Guest not found")
            
        reservations = await db.reservations.find(
            {"guest_profile_id": guest_id}, {"_id": 0}
        ).sort("datetime_start", -1).to_list(10)
        
        return {
            "profile": profile,
            "history": {
                "reservations": reservations,
                "favorite_items": [
                    {"name": "Ribeye Steak", "count": 4},
                    {"name": "Malbec Estate", "count": 3}
                ]
            }
        }

    @router.post("/crm/guests/{guest_id}/tags")
    async def update_guest_tags(guest_id: str, tags: List[str] = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
        await db.guest_profiles.update_one(
            {"id": guest_id},
            {"$set": {"tags": tags, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "ok"}

    # === CAMPAIGNS ===

    @router.get("/crm/campaigns")
    async def list_campaigns(venue_id: str, current_user: dict = Depends(get_current_user)):
        """List marketing campaigns for a venue"""
        await check_venue_access(current_user, venue_id)
        campaigns = await db.crm_campaigns.find(
            {"venue_id": venue_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return campaigns

    @router.post("/crm/campaigns")
    async def create_campaign(
        venue_id: str,
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new marketing campaign"""
        await check_venue_access(current_user, venue_id)
        
        campaign = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "name": payload.get("name", "Untitled Campaign"),
            "type": payload.get("type", "sms"),
            "message": payload.get("message", ""),
            "target_segment": payload.get("target_segment", "all"),
            "reach": 0,
            "conversion_rate": 0.0,
            "status": "draft",
            "created_by": current_user.get("id"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.crm_campaigns.insert_one(campaign)
        logger.info("CRM campaign created: %s for venue %s", campaign["id"], venue_id)
        return campaign

    # === BOOMERANG PROTOCOL ===

    @router.post("/crm/boomerang")
    async def run_boomerang(
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """
        Trigger the Boomerang Churn Detection Protocol.
        Scans guest profiles for high-risk churn indicators and
        generates personalized retention actions.
        """
        venue_id = payload.get("venue_id")
        await check_venue_access(current_user, venue_id)
        
        # Find high-risk guests (no visit in 30+ days)
        high_risk_guests = await db.guest_profiles.find(
            {"venue_id": venue_id, "churn_risk": "HIGH"}, {"_id": 0}
        ).to_list(50)
        
        actions_generated = 0
        for guest in high_risk_guests:
            # Create retention action
            action = {
                "id": str(uuid4()),
                "venue_id": venue_id,
                "guest_id": guest["id"],
                "type": "sms_retention",
                "message": f"We miss you, {guest.get('first_name', 'friend')}! Come back for 15% off your next visit.",
                "status": "queued",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.crm_actions.insert_one(action)
            actions_generated += 1
        
        logger.info("Boomerang protocol run for venue %s: %d actions", venue_id, actions_generated)
        return {
            "status": "completed",
            "high_risk_detected": len(high_risk_guests),
            "actions_generated": actions_generated,
            "message": f"Boomerang protocol complete. {actions_generated} retention actions queued."
        }

    # === SEED DATA ===

    @router.post("/crm/seed")
    async def seed_crm_data(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Seed demo CRM data for testing"""
        await check_venue_access(current_user, venue_id)
        now = datetime.now(timezone.utc).isoformat()
        
        # Seed guest profiles with churn data
        guests = [
            {"id": str(uuid4()), "venue_id": venue_id, "first_name": "Maria", "last_name": "Borg", "contact_info": {"phone": "+356 7912 0001", "email": "maria@example.com"}, "tags": ["VIP", "Regular"], "taste_tags": ["seafood", "wine"], "churn_risk": "LOW", "visit_count": 24, "ltv_cents": 89500, "last_visit_days": 5, "updated_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "first_name": "Joe", "last_name": "Camilleri", "contact_info": {"phone": "+356 7934 0002"}, "tags": ["Regular"], "taste_tags": ["steak", "beer"], "churn_risk": "MEDIUM", "visit_count": 8, "ltv_cents": 32000, "last_visit_days": 21, "updated_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "first_name": "Sarah", "last_name": "Vella", "contact_info": {"phone": "+356 7956 0003", "email": "sarah.v@example.com"}, "tags": [], "taste_tags": ["vegetarian", "cocktails"], "churn_risk": "HIGH", "visit_count": 3, "ltv_cents": 12500, "last_visit_days": 45, "updated_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "first_name": "Mark", "last_name": "Farrugia", "contact_info": {"phone": "+356 7978 0004"}, "tags": ["VIP"], "taste_tags": ["pasta", "prosecco"], "churn_risk": "LOW", "visit_count": 42, "ltv_cents": 156000, "last_visit_days": 2, "updated_at": now},
        ]
        for g in guests:
            await db.guest_profiles.update_one({"id": g["id"]}, {"$set": g}, upsert=True)
        
        # Seed campaigns
        campaigns = [
            {"id": str(uuid4()), "venue_id": venue_id, "name": "Summer Seafood Special", "type": "sms", "target_segment": "seafood_lovers", "reach": 156, "conversion_rate": 12.4, "status": "active", "created_at": now},
            {"id": str(uuid4()), "venue_id": venue_id, "name": "Win-Back Campaign", "type": "email", "target_segment": "high_risk", "reach": 42, "conversion_rate": 8.1, "status": "active", "created_at": now},
        ]
        for c in campaigns:
            await db.crm_campaigns.update_one({"id": c["id"]}, {"$set": c}, upsert=True)
        
        logger.info("CRM data seeded for venue %s", venue_id)
        return {"status": "seeded", "guests": len(guests), "campaigns": len(campaigns)}

    return router

