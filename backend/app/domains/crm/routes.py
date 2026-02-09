"""
🤖 CRM Autopilot Routes (Pillar 3) — Autonomous Retention Engine

Endpoints:
  GET  /api/crm/summary         — CRM metrics (total guests, churn risk, campaigns)
  GET  /api/crm/guests          — List guests with optional filtering
  GET  /api/crm/guests/{id}/360 — 360-degree guest profile
  POST /api/crm/guests/{id}/tags— Update guest taste tags
  GET  /api/crm/campaigns       — List active campaigns
  POST /api/crm/campaigns       — Create campaign
  POST /api/crm/boomerang       — Run the Boomerang re-engagement protocol
  POST /api/crm/seed            — Seed demo CRM data
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import os
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crm", tags=["crm-autopilot"])


# ==================== MODELS ====================

class TagUpdate(BaseModel):
    tags: list[str]

class CampaignCreate(BaseModel):
    name: str
    type: str = "sms"  # sms, email, push
    segment: str = "all"  # all, high_risk, vip, inactive
    message_template: Optional[str] = None

class BoomerangRequest(BaseModel):
    venue_id: str
    min_days_absent: int = 30
    min_ltv_cents: int = 5000


# ==================== SUMMARY ====================

@router.get("/summary")
async def get_crm_summary(venue_id: str = Query(...)):
    """CRM dashboard metrics."""
    db = get_database()

    total_guests = await db.guests.count_documents({})
    high_risk = await db.guests.count_documents({"churn_risk": "high"})
    medium_risk = await db.guests.count_documents({"churn_risk": "medium"})
    active_campaigns = await db.crm_campaigns.count_documents({"status": "active"})

    # Calculate retention rate
    recently_active = await db.guests.count_documents({
        "last_visit": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}
    })
    retention_rate = round((recently_active / max(total_guests, 1)) * 100, 1)

    # Total LTV
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_spent_cents"}}}]
    ltv_result = await db.guests.aggregate(pipeline).to_list(length=1)
    total_ltv = ltv_result[0]["total"] if ltv_result else 0

    return {
        "total_guests": total_guests,
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "active_campaigns": active_campaigns,
        "retention_rate": retention_rate,
        "total_ltv_cents": total_ltv,
        "venue_id": venue_id,
    }


# ==================== GUESTS ====================

@router.get("/guests")
async def list_guests(
    venue_id: str = Query(...),
    segment: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """List guests with optional filtering by segment or search."""
    db = get_database()
    query: dict[str, Any] = {}

    if segment and segment != "all":
        query["churn_risk"] = segment.lower()

    if q:
        query["name"] = {"$regex": q, "$options": "i"}

    guests = await db.guests.find(query).sort("total_spent_cents", -1).to_list(length=limit)
    
    result = []
    now = datetime.now(timezone.utc)
    for g in guests:
        g["_id"] = str(g["_id"])
        # Calculate lastVisitDays
        last_visit = g.get("last_visit", "")
        if last_visit:
            try:
                last_dt = datetime.fromisoformat(last_visit.replace("Z", "+00:00"))
                g["lastVisitDays"] = max(0, (now - last_dt).days)
            except Exception:
                g["lastVisitDays"] = 999
        else:
            g["lastVisitDays"] = 999

        g["visitCount"] = g.get("visit_count", 0)
        g["ltvCents"] = g.get("total_spent_cents", 0)
        g["spend"] = f"€{g['ltvCents'] / 100:,.0f}"
        g["risk"] = (g.get("churn_risk", "low") or "low").upper()
        g["tasteTags"] = g.get("tags", [])
        result.append(g)

    return result


@router.get("/guests/{guest_id}/360")
async def get_guest_360(guest_id: str):
    """Get a 360-degree view of a guest profile."""
    db = get_database()
    guest = await db.guests.find_one({"id": guest_id})
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    guest["_id"] = str(guest["_id"])

    # Fetch related orders
    orders = await db.orders.find(
        {"guest_name": guest.get("name")}
    ).sort("created_at", -1).to_list(length=20)
    for o in orders:
        o["_id"] = str(o["_id"])

    # Fetch related reservations
    reservations = await db.reservations.find(
        {"guest_name": guest.get("name")}
    ).sort("date", -1).to_list(length=10)
    for r in reservations:
        r["_id"] = str(r["_id"])

    # Fetch interaction history  
    interactions = await db.crm_interactions.find(
        {"guest_id": guest_id}
    ).sort("created_at", -1).to_list(length=20)
    for i in interactions:
        i["_id"] = str(i["_id"])

    return {
        "guest": guest,
        "orders": orders,
        "reservations": reservations,
        "interactions": interactions,
        "total_orders": len(orders),
        "total_reservations": len(reservations),
    }


@router.post("/guests/{guest_id}/tags")
async def update_guest_tags(guest_id: str, tags: list[str]):
    """Update guest taste/preference tags."""
    db = get_database()
    result = await db.guests.update_one(
        {"id": guest_id},
        {"$set": {"tags": tags, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Guest not found")
    return {"status": "updated", "guest_id": guest_id, "tags": tags}


# ==================== CAMPAIGNS ====================

@router.get("/campaigns")
async def list_campaigns(venue_id: str = Query(...)):
    """List marketing campaigns."""
    db = get_database()
    campaigns = await db.crm_campaigns.find(
        {"venue_id": venue_id}
    ).sort("created_at", -1).to_list(length=50)
    for c in campaigns:
        c["_id"] = str(c["_id"])
    return campaigns


@router.post("/campaigns")
async def create_campaign(campaign: CampaignCreate, venue_id: str = Query(...)):
    """Create a new CRM campaign."""
    db = get_database()
    doc = {
        "id": f"camp-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "name": campaign.name,
        "type": campaign.type,
        "segment": campaign.segment,
        "message_template": campaign.message_template,
        "status": "active",
        "reach": 0,
        "conversion_rate": 0,
        "sent_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.crm_campaigns.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ==================== BOOMERANG PROTOCOL ====================

@router.post("/boomerang")
async def run_boomerang(body: BoomerangRequest):
    """
    The Boomerang Protocol — Autonomous Re-engagement.
    1. Find high-risk churn guests (>30 days absent, LTV > threshold)
    2. Generate personalized messages via Gemini
    3. Log campaign actions + track billing
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=body.min_days_absent)).isoformat()

    # Find at-risk guests
    guests = await db.guests.find({}).to_list(length=500)
    at_risk = []
    for g in guests:
        last_visit = g.get("last_visit", "")
        ltv = g.get("total_spent_cents", 0)
        if last_visit and ltv >= body.min_ltv_cents:
            try:
                last_dt = datetime.fromisoformat(last_visit.replace("Z", "+00:00"))
                days_absent = (now - last_dt).days
                if days_absent >= body.min_days_absent:
                    g["days_absent"] = days_absent
                    at_risk.append(g)
            except Exception:
                continue

    if not at_risk:
        return {"status": "no_action", "message": "No at-risk guests found", "actions": []}

    # Generate personalized messages
    actions = []
    google_api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")

    for guest in at_risk[:20]:  # Cap at 20 per run
        tags = guest.get("tags", [])
        name = guest.get("name", "Valued Guest")
        days = guest.get("days_absent", 30)

        # Try AI generation
        message = ""
        tokens_used = 0
        if google_api_key:
            try:
                import httpx
                prompt = f"""Draft a personalized SMS for a restaurant guest named "{name}" who hasn't visited in {days} days. Their favorite items include: {', '.join(tags) if tags else 'fine dining'}. Keep it warm, short (under 160 chars), and mention a special treat."""

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={google_api_key}",
                        json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"temperature": 0.8, "maxOutputTokens": 80}
                        }
                    )
                    if resp.status_code == 200:
                        result = resp.json()
                        candidates = result.get("candidates", [])
                        if candidates:
                            message = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            tokens_used = len(prompt.split()) + len(message.split())
            except Exception as e:
                logger.error(f"Boomerang AI error: {e}")

        if not message:
            # Smart fallback
            treats = ["complimentary dessert", "a special cocktail on us", "chef's surprise amuse-bouche"]
            message = f"Hi {name}! We miss you at our table. Come back this week and enjoy a {random.choice(treats)}. Book now: restin.ai 🎁"

        action = {
            "id": f"boom-{uuid.uuid4().hex[:8]}",
            "guest_id": guest.get("id"),
            "guest_name": name,
            "message": message,
            "channel": "sms",
            "tokens_used": tokens_used,
            "cost": max(0.01, tokens_used * 0.0001),
            "status": "sent",
            "created_at": now.isoformat(),
        }
        actions.append(action)

    # Store interactions
    if actions:
        await db.crm_interactions.insert_many([{
            **a,
            "type": "boomerang",
            "venue_id": body.venue_id,
        } for a in actions])

        # Track AI usage for billing
        total_tokens = sum(a["tokens_used"] for a in actions)
        if total_tokens > 0:
            await db.ai_usage.insert_one({
                "id": f"usage-{uuid.uuid4().hex[:8]}",
                "venue_id": body.venue_id,
                "pillar": "crm",
                "provider": "gemini-flash",
                "tokens_used": total_tokens,
                "cost_cents": max(1, total_tokens // 100),
                "created_at": now.isoformat(),
            })

    # Create campaign record
    await db.crm_campaigns.insert_one({
        "id": f"camp-{uuid.uuid4().hex[:8]}",
        "venue_id": body.venue_id,
        "name": f"Boomerang — {now.strftime('%b %d %H:%M')}",
        "type": "sms",
        "segment": "high_risk",
        "status": "active",
        "reach": len(actions),
        "sent_count": len(actions),
        "conversion_rate": 0,
        "created_at": now.isoformat(),
    })

    return {
        "status": "executed",
        "guests_targeted": len(actions),
        "total_cost": round(sum(a["cost"] for a in actions), 4),
        "actions": actions,
    }


# ==================== SEED DEMO DATA ====================

@router.post("/seed")
async def seed_crm_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed sample CRM data for demo/testing."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # Seed campaigns
    campaigns = [
        {
            "id": "camp-sunset",
            "venue_id": venue_id,
            "name": "Sunset Pasta Special",
            "type": "sms",
            "segment": "all",
            "status": "active",
            "reach": 1200,
            "sent_count": 1200,
            "conversion_rate": 4.2,
            "message_template": "Enjoy our handmade pasta this week — sunset views included! 🍝",
            "created_at": (now - timedelta(days=3)).isoformat(),
        },
        {
            "id": "camp-vip-wine",
            "venue_id": venue_id,
            "name": "VIP Wine Night",
            "type": "email",
            "segment": "vip",
            "status": "active",
            "reach": 240,
            "sent_count": 240,
            "conversion_rate": 12.5,
            "message_template": "Exclusive tasting of 2019 Barolo — only for our VIP guests. RSVP now.",
            "created_at": (now - timedelta(days=7)).isoformat(),
        },
        {
            "id": "camp-brunch",
            "venue_id": venue_id,
            "name": "Weekend Brunch Boost",
            "type": "push",
            "segment": "inactive",
            "status": "active",
            "reach": 800,
            "sent_count": 800,
            "conversion_rate": 3.1,
            "message_template": "Bottomless mimosas and our signature eggs benedict — this Saturday only!",
            "created_at": (now - timedelta(days=1)).isoformat(),
        },
    ]
    await db.crm_campaigns.delete_many({"venue_id": venue_id})
    await db.crm_campaigns.insert_many(campaigns)

    # Seed some interactions
    interactions = []
    for i in range(12):
        interactions.append({
            "id": f"int-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "guest_id": f"guest-{random.randint(1, 16):03d}",
            "type": random.choice(["boomerang", "campaign", "manual"]),
            "channel": random.choice(["sms", "email", "push"]),
            "message": random.choice([
                "We miss you! Come back for a complimentary dessert.",
                "Your table is waiting — book now for this weekend.",
                "New seasonal menu is here! Try our winter specials.",
            ]),
            "status": random.choice(["sent", "delivered", "opened", "converted"]),
            "created_at": (now - timedelta(hours=random.randint(1, 168))).isoformat(),
        })
    await db.crm_interactions.delete_many({"venue_id": venue_id})
    await db.crm_interactions.insert_many(interactions)

    return {
        "status": "seeded",
        "campaigns": len(campaigns),
        "interactions": len(interactions),
    }
