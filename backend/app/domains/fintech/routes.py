"""
💳 Fintech Routes (Pillar 8) — Payments, Kiosk Mode, Split Bills

Endpoints:
  POST /api/pay/transaction            — Process payment
  POST /api/fintech/kiosk/toggle       — Toggle Kiosk mode
  POST /api/fintech/split              — Split a bill
  GET  /api/fintech/stats              — Payment analytics
  GET  /api/fintech/transactions       — Transaction history
  POST /api/fintech/seed               — Seed demo data
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import random

logger = logging.getLogger(__name__)

router = APIRouter(tags=["fintech"])


class PaymentRequest(BaseModel):
    amountCents: int
    method: str = "CARD"  # CARD | CASH | QR
    order_id: Optional[str] = None
    tip_cents: Optional[int] = 0

    class Config:
        extra = "allow"


class SplitRequest(BaseModel):
    splitType: str = "EQUAL"  # EQUAL | ITEM | CUSTOM
    parts: int = 2

    class Config:
        extra = "allow"


# Payment Processing
@router.post("/api/pay/transaction")
async def process_payment(body: PaymentRequest):
    """Process a payment transaction."""
    db = get_database()
    
    transaction = {
        "id": f"txn-{uuid.uuid4().hex[:8]}",
        "amount_cents": body.amountCents,
        "tip_cents": body.tip_cents or 0,
        "total_cents": body.amountCents + (body.tip_cents or 0),
        "method": body.method,
        "order_id": body.order_id,
        "status": "completed",
        "fiscal_status": "pending",  # Malta/Exo compliance
        "processor": "stripe" if body.method == "CARD" else "cash_register",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(transaction)
    transaction.pop("_id", None)
    
    # Update order status if linked
    if body.order_id:
        await db.orders.update_one(
            {"id": body.order_id},
            {"$set": {"status": "paid", "payment_method": body.method}}
        )

    return transaction


# Kiosk Mode
@router.post("/api/fintech/kiosk/toggle")
async def toggle_kiosk(venue_id: str = Query(...), enabled: bool = True):
    """Toggle Kiosk/Self-Service Mode for a venue."""
    db = get_database()
    await db.venue_configs.update_one(
        {"venue_id": venue_id},
        {"$set": {"kiosk_mode": enabled, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "toggled", "kiosk_mode": enabled, "venue_id": venue_id}


# Split Bill
@router.post("/api/fintech/split")
async def split_bill(body: SplitRequest, venue_id: str = Query(...), order_id: str = Query(...)):
    """Split a bill into equal or per-item parts."""
    db = get_database()
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        return {"error": "Order not found"}
    
    total = order.get("total_cents", 0)
    parts = max(body.parts, 2)
    
    if body.splitType == "EQUAL":
        split_amount = total // parts
        remainder = total - (split_amount * parts)
        splits = [{"part": i + 1, "amount_cents": split_amount + (remainder if i == 0 else 0), "status": "pending"} for i in range(parts)]
    else:
        # Item-based split
        items = order.get("items", [])
        splits = [{"part": i + 1, "items": [items[i]] if i < len(items) else [], "amount_cents": items[i].get("subtotal_cents", 0) if i < len(items) else 0, "status": "pending"} for i in range(min(parts, len(items)))]

    await db.orders.update_one({"id": order_id}, {"$set": {"splits": splits, "split_type": body.splitType}})

    return {"order_id": order_id, "split_type": body.splitType, "parts": splits}


# Analytics
@router.get("/api/fintech/stats")
async def payment_stats(venue_id: str = Query(...)):
    """Payment analytics."""
    db = get_database()
    
    total_txns = await db.transactions.count_documents({})
    card_txns = await db.transactions.count_documents({"method": "CARD"})
    cash_txns = await db.transactions.count_documents({"method": "CASH"})
    
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount_cents"}, "tips": {"$sum": "$tip_cents"}}}]
    result = await db.transactions.aggregate(pipeline).to_list(length=1)
    total_revenue = result[0]["total"] if result else 0
    total_tips = result[0]["tips"] if result else 0

    return {
        "venue_id": venue_id,
        "total_transactions": total_txns,
        "card_transactions": card_txns,
        "cash_transactions": cash_txns,
        "total_revenue_cents": total_revenue,
        "total_tips_cents": total_tips,
        "avg_transaction_cents": total_revenue // max(total_txns, 1),
    }


@router.get("/api/fintech/transactions")
async def list_transactions(venue_id: str = Query(...), limit: int = Query(50)):
    """List recent transactions."""
    db = get_database()
    txns = await db.transactions.find({}).sort("created_at", -1).to_list(length=limit)
    for t in txns:
        t["_id"] = str(t["_id"])
    return txns


@router.post("/api/fintech/seed")
async def seed_fintech_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed demo transaction data."""
    db = get_database()
    now = datetime.now(timezone.utc)

    txns = []
    for i in range(30):
        amount = random.randint(2500, 15000)
        method = random.choice(["CARD", "CARD", "CARD", "CASH", "QR"])
        tip = random.randint(0, amount // 5) if method == "CARD" else 0
        txns.append({
            "id": f"txn-demo-{i+1:03d}",
            "amount_cents": amount,
            "tip_cents": tip,
            "total_cents": amount + tip,
            "method": method,
            "order_id": f"ord-demo-{i+1:03d}",
            "status": "completed",
            "fiscal_status": "synced",
            "processor": "stripe" if method == "CARD" else ("qr_provider" if method == "QR" else "cash_register"),
            "created_at": (now - timedelta(hours=random.randint(1, 168))).isoformat(),
        })
    await db.transactions.delete_many({})
    await db.transactions.insert_many(txns)
    return {"status": "seeded", "transactions": len(txns)}
