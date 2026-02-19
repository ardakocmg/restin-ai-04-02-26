"""Loyalty Routes — Full CRUD for loyalty program management"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo
import logging

logger = logging.getLogger(__name__)


def create_loyalty_router():
    router = APIRouter(tags=["loyalty"])

    # ─── LIST ACCOUNTS ───
    @router.get("/loyalty/accounts")
    async def list_accounts(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        accounts = await db.loyalty_accounts.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("points_balance", -1).to_list(500)
        return {"ok": True, "data": accounts}

    # ─── SUMMARY STATS ───
    @router.get("/loyalty/stats")
    async def get_loyalty_stats(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        total = await db.loyalty_accounts.count_documents({"venue_id": venue_id})
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": None,
                "total_points": {"$sum": "$points_balance"},
                "total_redeemed": {"$sum": "$points_redeemed"},
                "avg_points": {"$avg": "$points_balance"},
            }}
        ]
        agg = await db.loyalty_accounts.aggregate(pipeline).to_list(1)
        stats = agg[0] if agg else {"total_points": 0, "total_redeemed": 0, "avg_points": 0}

        # Tier breakdown
        tiers = {}
        for tier in ["BRONZE", "SILVER", "GOLD", "PLATINUM"]:
            count = await db.loyalty_accounts.count_documents({"venue_id": venue_id, "tier": tier})
            tiers[tier] = count

        return {
            "ok": True,
            "data": {
                "total_members": total,
                "total_points_outstanding": stats.get("total_points", 0),
                "total_points_redeemed": stats.get("total_redeemed", 0),
                "average_points": round(stats.get("avg_points", 0)),
                "tier_breakdown": tiers,
            }
        }

    # ─── ENROLL GUEST ───
    @router.post("/loyalty/enroll")
    async def enroll_guest(
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        venue_id = payload.get("venue_id")
        guest_name = payload.get("guest_name", "Guest")
        guest_email = payload.get("guest_email", "")
        guest_phone = payload.get("guest_phone", "")

        if not venue_id:
            raise HTTPException(400, "venue_id required")

        await check_venue_access(current_user, venue_id)

        # Check duplicate
        existing = await db.loyalty_accounts.find_one({
            "venue_id": venue_id,
            "$or": [
                {"guest_email": guest_email} if guest_email else {"_impossible": True},
                {"guest_phone": guest_phone} if guest_phone else {"_impossible": True},
            ]
        })
        if existing:
            raise HTTPException(409, "Guest already enrolled in loyalty program")

        account = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "guest_name": guest_name,
            "guest_email": guest_email,
            "guest_phone": guest_phone,
            "points_balance": 100,  # Welcome bonus
            "points_redeemed": 0,
            "tier": "BRONZE",
            "visits": 0,
            "lifetime_spend_cents": 0,
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat(),
        }
        await db.loyalty_accounts.insert_one(account)
        account.pop("_id", None)
        logger.info(f"Loyalty enrollment: {guest_name} at {venue_id}")
        return {"ok": True, "data": account}

    # ─── REDEEM POINTS ───
    @router.post("/loyalty/redeem")
    async def redeem_points(
        payload: Dict[str, Any] = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        account_id = payload.get("account_id")
        points = payload.get("points", 0)
        reward_name = payload.get("reward_name", "Reward")

        if not account_id or points <= 0:
            raise HTTPException(400, "account_id and positive points required")

        account = await db.loyalty_accounts.find_one({"id": account_id})
        if not account:
            raise HTTPException(404, "Loyalty account not found")

        await check_venue_access(current_user, account["venue_id"])

        if account.get("points_balance", 0) < points:
            raise HTTPException(400, f"Insufficient points. Balance: {account.get('points_balance', 0)}")

        await db.loyalty_accounts.update_one(
            {"id": account_id},
            {
                "$inc": {"points_balance": -points, "points_redeemed": points},
                "$set": {"last_activity": datetime.now(timezone.utc).isoformat()}
            }
        )

        # Log redemption
        redemption = {
            "id": str(uuid4()),
            "account_id": account_id,
            "venue_id": account["venue_id"],
            "points": points,
            "reward_name": reward_name,
            "redeemed_at": datetime.now(timezone.utc).isoformat(),
            "redeemed_by": current_user.get("email", "system"),
        }
        await db.loyalty_redemptions.insert_one(redemption)
        logger.info(f"Loyalty redemption: {points} pts for {reward_name}")
        return {"ok": True, "data": {"points_deducted": points, "reward": reward_name}}

    # ─── TIER CONFIG ───
    @router.get("/loyalty/tiers")
    async def get_tiers(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        config = await db.loyalty_config.find_one({"venue_id": venue_id}, {"_id": 0})
        if not config:
            config = {
                "venue_id": venue_id,
                "tiers": [
                    {"name": "BRONZE", "min_points": 0, "perks": ["Welcome drink"]},
                    {"name": "SILVER", "min_points": 500, "perks": ["10% discount", "Priority seating"]},
                    {"name": "GOLD", "min_points": 1500, "perks": ["15% discount", "Free dessert", "VIP access"]},
                    {"name": "PLATINUM", "min_points": 5000, "perks": ["20% discount", "Chef's table", "Birthday surprise", "VIP access"]},
                ],
                "points_per_euro": 1,
                "welcome_bonus": 100,
            }
        return {"ok": True, "data": config}

    # ─── SEED DEMO DATA ───
    @router.post("/loyalty/seed/{venue_id}")
    async def seed_loyalty_data(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        demo_accounts = [
            {"id": str(uuid4()), "venue_id": venue_id, "guest_name": "Maria Borg", "guest_email": "maria@example.com", "guest_phone": "+35679123456", "points_balance": 2340, "points_redeemed": 500, "tier": "GOLD", "visits": 18, "lifetime_spend_cents": 245000, "enrolled_at": "2025-06-15T10:00:00Z", "last_activity": "2026-02-10T19:30:00Z"},
            {"id": str(uuid4()), "venue_id": venue_id, "guest_name": "John Attard", "guest_email": "john@example.com", "guest_phone": "+35679234567", "points_balance": 780, "points_redeemed": 200, "tier": "SILVER", "visits": 9, "lifetime_spend_cents": 98000, "enrolled_at": "2025-09-01T12:00:00Z", "last_activity": "2026-02-08T20:15:00Z"},
            {"id": str(uuid4()), "venue_id": venue_id, "guest_name": "Sophie Camilleri", "guest_email": "sophie@example.com", "guest_phone": "+35679345678", "points_balance": 6200, "points_redeemed": 1500, "tier": "PLATINUM", "visits": 42, "lifetime_spend_cents": 620000, "enrolled_at": "2025-01-10T09:00:00Z", "last_activity": "2026-02-17T21:00:00Z"},
            {"id": str(uuid4()), "venue_id": venue_id, "guest_name": "David Zammit", "guest_email": "david@example.com", "guest_phone": "+35679456789", "points_balance": 150, "points_redeemed": 0, "tier": "BRONZE", "visits": 2, "lifetime_spend_cents": 15000, "enrolled_at": "2026-01-20T14:00:00Z", "last_activity": "2026-02-05T18:45:00Z"},
            {"id": str(uuid4()), "venue_id": venue_id, "guest_name": "Lisa Vella", "guest_email": "lisa@example.com", "guest_phone": "+35679567890", "points_balance": 1100, "points_redeemed": 300, "tier": "SILVER", "visits": 12, "lifetime_spend_cents": 140000, "enrolled_at": "2025-07-22T11:00:00Z", "last_activity": "2026-02-14T20:30:00Z"},
            {"id": str(uuid4()), "venue_id": venue_id, "guest_name": "Mark Spiteri", "guest_email": "mark@example.com", "guest_phone": "+35679678901", "points_balance": 3500, "points_redeemed": 800, "tier": "GOLD", "visits": 25, "lifetime_spend_cents": 350000, "enrolled_at": "2025-03-05T16:00:00Z", "last_activity": "2026-02-16T19:00:00Z"},
        ]

        await db.loyalty_accounts.delete_many({"venue_id": venue_id})
        if demo_accounts:
            await db.loyalty_accounts.insert_many(demo_accounts)

        logger.info(f"Seeded {len(demo_accounts)} loyalty accounts for {venue_id}")
        return {"ok": True, "seeded": len(demo_accounts)}

    return router
