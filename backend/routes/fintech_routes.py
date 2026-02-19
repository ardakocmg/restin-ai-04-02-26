"""
Fintech Routes (Pillar 8: Omni-Payment)
Handles transaction stats, transaction listing, kiosk mode, and seeding.
Connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from typing import Dict, Any, List
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone, timedelta
import logging
import random
import string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fintech", tags=["Fintech (Pillar 8)"])


def _generate_transactions(venue_id: str, count: int = 25) -> List[Dict[str, Any]]:
    """Generate realistic demo transactions."""
    now = datetime.now(timezone.utc)
    methods = ["CARD", "CASH", "QR"]
    statuses = ["completed", "completed", "completed", "pending", "refunded"]
    txns = []

    for i in range(count):
        method = random.choice(methods)
        amount = random.randint(800, 8500)
        tip = random.randint(0, 500) if method == "CARD" else 0
        txn_id = f"TXN-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"

        txns.append({
            "id": txn_id,
            "venue_id": venue_id,
            "method": method,
            "amount_cents": amount,
            "tip_cents": tip,
            "total_cents": amount + tip,
            "status": random.choice(statuses),
            "created_at": (now - timedelta(minutes=random.randint(5, 1440))).isoformat(),
        })

    txns.sort(key=lambda x: x["created_at"], reverse=True)
    return txns


@router.get("/stats")
async def get_fintech_stats(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get aggregated financial stats for the venue from MongoDB."""
    # Try to get transactions from DB
    txns_cursor = db.fintech_transactions.find({"venue_id": venue_id}).sort("created_at", -1).limit(100)
    txns = await txns_cursor.to_list(length=100)

    if not txns:
        # Auto-seed if empty
        txns = _generate_transactions(venue_id)
        if txns:
            await db.fintech_transactions.insert_many(txns)
        logger.info(f"Auto-seeded {len(txns)} fintech transactions for venue {venue_id}")

    completed = [t for t in txns if t.get("status") == "completed"]
    total_rev = sum(t.get("total_cents", 0) for t in completed)
    total_tips = sum(t.get("tip_cents", 0) for t in completed)
    card_count = sum(1 for t in completed if t.get("method") == "CARD")
    cash_count = sum(1 for t in completed if t.get("method") == "CASH")

    return {
        "total_transactions": len(txns),
        "total_revenue_cents": total_rev,
        "total_tips_cents": total_tips,
        "avg_transaction_cents": round(total_rev / max(len(completed), 1)),
        "card_transactions": card_count,
        "cash_transactions": cash_count,
    }


@router.get("/transactions")
async def get_transactions(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get list of recent transactions from MongoDB."""
    txns_cursor = db.fintech_transactions.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("created_at", -1).limit(50)
    txns = await txns_cursor.to_list(length=50)

    if not txns:
        txns = _generate_transactions(venue_id)
        if txns:
            await db.fintech_transactions.insert_many(txns)
        # Re-fetch without _id
        txns_cursor = db.fintech_transactions.find(
            {"venue_id": venue_id}, {"_id": 0}
        ).sort("created_at", -1).limit(50)
        txns = await txns_cursor.to_list(length=50)

    return txns


@router.post("/seed")
async def seed_fintech_data(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Re-seed demo transaction data into MongoDB."""
    await db.fintech_transactions.delete_many({"venue_id": venue_id})
    txns = _generate_transactions(venue_id)
    if txns:
        await db.fintech_transactions.insert_many(txns)
    return {"status": "ok", "count": len(txns)}


# === KIOSK MODE ===

@router.get("/kiosk/config")
async def get_kiosk_config(
    venue_id: str = Query(...),
    db=Depends(get_database),
):
    """Get kiosk mode configuration."""
    config = await db.kiosk_configs.find_one({"venue_id": venue_id}, {"_id": 0})
    if not config:
        return {
            "venue_id": venue_id,
            "enabled": False,
            "idle_timeout_seconds": 120,
            "allow_cash": False,
            "allow_tips": True,
            "tip_suggestions": [10, 15, 20],
            "theme": "dark",
            "logo_url": None,
        }
    return config


@router.post("/kiosk/config")
async def update_kiosk_config(
    venue_id: str = Query(...),
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Toggle kiosk mode and configure settings."""
    from uuid import uuid4

    payload["venue_id"] = venue_id
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.kiosk_configs.update_one(
        {"venue_id": venue_id},
        {"$set": payload},
        upsert=True,
    )
    logger.info("Kiosk config updated for venue %s (enabled=%s)", venue_id, payload.get("enabled"))
    return {"status": "ok", **payload}


# === SPLIT PAY ===

@router.post("/split")
async def create_split(
    venue_id: str = Query(...),
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Create a split payment for an order."""
    from uuid import uuid4

    order_id = payload.get("order_id")
    method = payload.get("method", "equal")  # equal, by_seat, by_item, custom
    split_count = payload.get("split_count", 2)
    total_cents = payload.get("total_cents", 0)

    splits = []
    if method == "equal":
        per_person = total_cents // split_count
        remainder = total_cents % split_count
        for i in range(split_count):
            splits.append({
                "id": str(uuid4()),
                "label": f"Guest {i + 1}",
                "amount_cents": per_person + (1 if i < remainder else 0),
                "status": "pending",
            })

    split_record = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "order_id": order_id,
        "method": method,
        "total_cents": total_cents,
        "splits": splits,
        "status": "active",
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.split_payments.insert_one(split_record)
    split_record.pop("_id", None)

    return split_record


def create_fintech_router():
    return router
