"""Loyalty Earn Service"""
from datetime import datetime, timezone

from core.database import db
from core.events_outbox import Outbox
from services.event_bus import event_handler


@event_handler("pos.order.closed")
async def earn_loyalty_points(event: dict):
    """Award loyalty points when order closes"""
    data = event["data"]
    venue_id = data.get("venue_id")
    total = data.get("total", 0)
    
    # Check if loyalty enabled
    from core.venue_config import VenueConfigRepo
    config_repo = VenueConfigRepo(db)
    cfg = await config_repo.get(venue_id)
    
    if not cfg.get("features", {}).get("loyalty"):
        return
    
    # Award points (1 point per €10 spent for example)
    points = total / 10
    
    # Find guest account (if exists)
    # For now, log to loyalty_transactions
    await db.loyalty_transactions.insert_one({
        "guest_id": "system",
        "type": "EARN",
        "points": points,
        "ref_type": "order",
        "ref_id": data.get("order_id"),
        "ts": datetime.now(timezone.utc).isoformat(),
        "idempotency_key": f"LOYALTY:EARN:{data.get('order_id')}"
    })
    
    print(f"🎁 Loyalty: Earned {points} points")
