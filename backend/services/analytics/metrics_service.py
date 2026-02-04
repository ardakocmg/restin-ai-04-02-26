"""Analytics Metrics Service"""
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler


@event_handler("pos.order.closed")
async def capture_sales_metric(event: dict):
    """Capture sales metrics"""
    data = event["data"]
    venue_id = data.get("venue_id")
    total = data.get("total", 0)
    
    # Store snapshot
    await db.metric_snapshots.insert_one({
        "venue_id": venue_id,
        "metric_id": "sales_total",
        "window": "hourly",
        "value": total,
        "ts": datetime.now(timezone.utc).isoformat()
    })
    
    print(f"📊 Analytics: Sales metric captured €{total}")
