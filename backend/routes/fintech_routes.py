"""
Fintech Routes (Pillar 8: Omni-Payment)
Handles transaction stats, transaction listing, kiosk mode, and seeding.
Connected to MongoDB for persistence.
"""
from fastapi import APIRouter, Depends, Query
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


def create_fintech_router():
    return router
