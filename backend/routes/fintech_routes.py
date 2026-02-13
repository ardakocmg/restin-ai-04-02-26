"""
Fintech Routes (Pillar 8: Omni-Payment)
Handles transaction stats, transaction listing, kiosk mode, and seeding.
"""
from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
from core.dependencies import get_current_user
from datetime import datetime, timezone, timedelta
import logging
import random
import uuid
import string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fintech", tags=["Fintech (Pillar 8)"])


# ─── In-memory transaction store ─────────────────────────────────────────
_transactions: Dict[str, List[Dict[str, Any]]] = {}


def _ensure_seeded(venue_id: str) -> List[Dict[str, Any]]:
    """Ensure venue has demo transactions."""
    if venue_id not in _transactions or len(_transactions[venue_id]) == 0:
        _seed_transactions(venue_id)
    return _transactions[venue_id]


def _seed_transactions(venue_id: str):
    """Generate realistic demo transactions."""
    now = datetime.now(timezone.utc)
    methods = ["CARD", "CASH", "QR"]
    statuses = ["completed", "completed", "completed", "pending", "refunded"]
    txns = []

    for i in range(25):
        method = random.choice(methods)
        amount = random.randint(800, 8500)  # 8.00 to 85.00 EUR
        tip = random.randint(0, 500) if method == "CARD" else 0
        txn_id = f"TXN-{''.join(random.choices(string.ascii_uppercase + string.digits, k=6))}"

        txns.append({
            "id": txn_id,
            "method": method,
            "amount_cents": amount,
            "tip_cents": tip,
            "total_cents": amount + tip,
            "status": random.choice(statuses),
            "created_at": (now - timedelta(minutes=random.randint(5, 1440))).isoformat(),
        })

    # Sort by most recent first
    txns.sort(key=lambda x: x["created_at"], reverse=True)
    _transactions[venue_id] = txns


@router.get("/stats")
async def get_fintech_stats(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Get aggregated financial stats for the venue."""
    txns = _ensure_seeded(venue_id)

    completed = [t for t in txns if t["status"] == "completed"]
    total_rev = sum(t["total_cents"] for t in completed)
    total_tips = sum(t["tip_cents"] for t in completed)
    card_count = sum(1 for t in completed if t["method"] == "CARD")
    cash_count = sum(1 for t in completed if t["method"] == "CASH")

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
):
    """Get list of recent transactions."""
    txns = _ensure_seeded(venue_id)
    return txns


@router.post("/seed")
async def seed_fintech_data(
    venue_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Re-seed demo transaction data."""
    _seed_transactions(venue_id)
    return {"status": "ok", "count": len(_transactions[venue_id])}


def create_fintech_router():
    return router
