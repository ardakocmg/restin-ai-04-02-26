"""
Marketing Automations Routes (Pillar 3 Extension)
===================================================
Campaign management, templates, automated triggers.
Works with CRM guest profiles for targeted campaigns.
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import Dict, Any, List
from core.database import db
from core.dependencies import get_current_user, check_venue_access
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)


def create_marketing_router():
    router = APIRouter(prefix="/marketing", tags=["Marketing Automations"])

    # ─── LIST CAMPAIGNS ───
    @router.get("/campaigns")
    async def list_campaigns(
        venue_id: str = Query(...),
        status: str = Query(None),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        campaigns = await db.marketing_campaigns.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return {"ok": True, "data": campaigns}

    # ─── CREATE CAMPAIGN ───
    @router.post("/campaigns")
    async def create_campaign(
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        venue_id = payload.get("venue_id")
        if not venue_id:
            raise HTTPException(400, "venue_id required")
        await check_venue_access(current_user, venue_id)

        campaign = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "name": payload.get("name", "Untitled Campaign"),
            "type": payload.get("type", "email"),  # email, sms, push
            "subject": payload.get("subject", ""),
            "body": payload.get("body", ""),
            "template_id": payload.get("template_id"),
            "target_segment": payload.get("target_segment", "all"),  # all, vip, at_risk, new
            "target_count": 0,
            "sent_count": 0,
            "open_rate": 0,
            "click_rate": 0,
            "conversion_rate": 0,
            "status": "draft",
            "scheduled_at": payload.get("scheduled_at"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("email", "system"),
        }
        await db.marketing_campaigns.insert_one(campaign)
        campaign.pop("_id", None)
        logger.info(f"Campaign created: {campaign['name']}")
        return {"ok": True, "data": campaign}

    # ─── UPDATE CAMPAIGN ───
    @router.put("/campaigns/{campaign_id}")
    async def update_campaign(
        campaign_id: str,
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        existing = await db.marketing_campaigns.find_one({"id": campaign_id})
        if not existing:
            raise HTTPException(404, "Campaign not found")
        await check_venue_access(current_user, existing["venue_id"])

        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        payload.pop("id", None)
        payload.pop("venue_id", None)

        await db.marketing_campaigns.update_one(
            {"id": campaign_id}, {"$set": payload}
        )
        return {"ok": True, "message": "Campaign updated"}

    # ─── SEND CAMPAIGN ───
    @router.post("/campaigns/{campaign_id}/send")
    async def send_campaign(
        campaign_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        campaign = await db.marketing_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise HTTPException(404, "Campaign not found")
        await check_venue_access(current_user, campaign["venue_id"])

        if campaign.get("status") == "sent":
            raise HTTPException(400, "Campaign already sent")

        # Count target audience
        venue_id = campaign["venue_id"]
        segment = campaign.get("target_segment", "all")
        guest_query = {"venue_id": venue_id}
        if segment == "vip":
            guest_query["tags"] = "VIP"
        elif segment == "at_risk":
            guest_query["tags"] = "NO_SHOW_RISK"

        target_count = await db.guest_profiles.count_documents(guest_query)
        if target_count == 0:
            target_count = await db.loyalty_accounts.count_documents({"venue_id": venue_id})

        await db.marketing_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "sent_by": current_user.get("email", "system"),
                "target_count": target_count,
                "sent_count": target_count,
            }}
        )
        logger.info(f"Campaign sent: {campaign['name']} to {target_count} recipients")
        return {"ok": True, "sent_to": target_count}

    # ─── LIST TEMPLATES ───
    @router.get("/templates")
    async def list_templates(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        templates = await db.marketing_templates.find(
            {"$or": [{"venue_id": venue_id}, {"venue_id": "global"}]},
            {"_id": 0}
        ).sort("name", 1).to_list(50)
        return {"ok": True, "data": templates}

    # ─── CREATE TEMPLATE ───
    @router.post("/templates")
    async def create_template(
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        venue_id = payload.get("venue_id")
        if not venue_id:
            raise HTTPException(400, "venue_id required")
        await check_venue_access(current_user, venue_id)

        template = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "name": payload.get("name", "Untitled Template"),
            "type": payload.get("type", "email"),
            "subject": payload.get("subject", ""),
            "body": payload.get("body", ""),
            "variables": payload.get("variables", ["guest_name", "venue_name"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.marketing_templates.insert_one(template)
        template.pop("_id", None)
        return {"ok": True, "data": template}

    # ─── CAMPAIGN STATS ───
    @router.get("/stats")
    async def get_marketing_stats(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        total = await db.marketing_campaigns.count_documents({"venue_id": venue_id})
        sent = await db.marketing_campaigns.count_documents({"venue_id": venue_id, "status": "sent"})
        drafts = await db.marketing_campaigns.count_documents({"venue_id": venue_id, "status": "draft"})

        pipeline = [
            {"$match": {"venue_id": venue_id, "status": "sent"}},
            {"$group": {
                "_id": None,
                "total_sent": {"$sum": "$sent_count"},
                "avg_open_rate": {"$avg": "$open_rate"},
                "avg_click_rate": {"$avg": "$click_rate"},
                "avg_conversion": {"$avg": "$conversion_rate"},
            }}
        ]
        agg = await db.marketing_campaigns.aggregate(pipeline).to_list(1)
        perf = agg[0] if agg else {"total_sent": 0, "avg_open_rate": 0, "avg_click_rate": 0, "avg_conversion": 0}

        return {
            "ok": True,
            "data": {
                "total_campaigns": total,
                "sent_campaigns": sent,
                "draft_campaigns": drafts,
                "total_messages_sent": perf.get("total_sent", 0),
                "avg_open_rate": round(perf.get("avg_open_rate", 0), 1),
                "avg_click_rate": round(perf.get("avg_click_rate", 0), 1),
                "avg_conversion_rate": round(perf.get("avg_conversion", 0), 1),
            }
        }

    # ─── SEED DEMO DATA ───
    @router.post("/seed/{venue_id}")
    async def seed_marketing_data(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        templates = [
            {"id": str(uuid4()), "venue_id": "global", "name": "Welcome Email", "type": "email", "subject": "Welcome to {{venue_name}}!", "body": "Hi {{guest_name}}, welcome to our loyalty program! 🎉", "variables": ["guest_name", "venue_name"], "created_at": "2025-01-01T00:00:00Z"},
            {"id": str(uuid4()), "venue_id": "global", "name": "We Miss You", "type": "email", "subject": "{{guest_name}}, we miss you! 🥺", "body": "It's been a while since your last visit. Come back for a special treat!", "variables": ["guest_name"], "created_at": "2025-01-01T00:00:00Z"},
            {"id": str(uuid4()), "venue_id": "global", "name": "Birthday Surprise", "type": "sms", "subject": "", "body": "Happy Birthday {{guest_name}}! 🎂 Visit us today for a complimentary dessert!", "variables": ["guest_name"], "created_at": "2025-01-01T00:00:00Z"},
            {"id": str(uuid4()), "venue_id": "global", "name": "Weekly Special", "type": "push", "subject": "This Week's Special", "body": "Check out our chef's special this week!", "variables": ["venue_name"], "created_at": "2025-01-01T00:00:00Z"},
        ]

        campaigns = [
            {"id": str(uuid4()), "venue_id": venue_id, "name": "Valentine's Day Promo", "type": "email", "subject": "Valentine's Dinner for Two ❤️", "body": "Book now for our special Valentine's tasting menu", "target_segment": "all", "target_count": 245, "sent_count": 245, "open_rate": 42.5, "click_rate": 18.2, "conversion_rate": 8.5, "status": "sent", "sent_at": "2026-02-10T09:00:00Z", "created_at": "2026-02-05T10:00:00Z", "created_by": "owner@example.com"},
            {"id": str(uuid4()), "venue_id": venue_id, "name": "VIP Exclusive Tasting", "type": "sms", "subject": "", "body": "Exclusive wine tasting event for our VIP guests", "target_segment": "vip", "target_count": 32, "sent_count": 32, "open_rate": 89.0, "click_rate": 45.0, "conversion_rate": 28.0, "status": "sent", "sent_at": "2026-02-01T14:00:00Z", "created_at": "2026-01-28T11:00:00Z", "created_by": "owner@example.com"},
            {"id": str(uuid4()), "venue_id": venue_id, "name": "Win-Back Campaign", "type": "email", "subject": "We miss you! Come back for 20% off", "body": "It's been a while...", "target_segment": "at_risk", "target_count": 0, "sent_count": 0, "open_rate": 0, "click_rate": 0, "conversion_rate": 0, "status": "draft", "created_at": "2026-02-15T16:00:00Z", "created_by": "owner@example.com"},
            {"id": str(uuid4()), "venue_id": venue_id, "name": "Weekend Brunch Launch", "type": "push", "subject": "New Weekend Brunch Menu! 🥂", "body": "Starting this Saturday — our all-new brunch menu", "target_segment": "all", "target_count": 180, "sent_count": 180, "open_rate": 35.0, "click_rate": 22.0, "conversion_rate": 12.0, "status": "sent", "sent_at": "2026-01-20T08:00:00Z", "created_at": "2026-01-18T10:00:00Z", "created_by": "owner@example.com"},
        ]

        await db.marketing_templates.delete_many({"$or": [{"venue_id": venue_id}, {"venue_id": "global"}]})
        await db.marketing_campaigns.delete_many({"venue_id": venue_id})
        await db.marketing_templates.insert_many(templates)
        await db.marketing_campaigns.insert_many(campaigns)

        logger.info(f"Seeded marketing data for {venue_id}")
        return {"ok": True, "seeded_campaigns": len(campaigns), "seeded_templates": len(templates)}

    return router
