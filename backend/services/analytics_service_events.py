"""Analytics Service - Event-driven analytics and reporting"""
from typing import Dict
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry


class AnalyticsService:
    """Analytics service (listens to business events)"""
    
    def __init__(self):
        self.service_name = "AnalyticsService"
    
    async def initialize(self):
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["analytics_track", "revenue_report", "trends_analysis"],
            subscribed_events=["order.closed", "order.created", "reservation.created"]
        )


@event_handler("order.closed")
async def track_revenue(event: Dict):
    """Track revenue from closed orders"""
    data = event["data"]
    
    analytics_record = {
        "id": f"analytics_{event['id']}",
        "event_type": "revenue",
        "venue_id": data.get("venue_id"),
        "order_id": data.get("order_id"),
        "amount": data.get("total", 0),
        "date": datetime.now(timezone.utc).date().isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.analytics.insert_one(analytics_record)
    print(f"📊 AnalyticsService: Revenue tracked ${data.get('total', 0)}")


@event_handler("order.created")
async def track_order_created(event: Dict):
    """Track order creation metrics"""
    data = event["data"]
    
    # Track order creation time, table, etc.
    metric = {
        "event_type": "order_created",
        "venue_id": data.get("venue_id"),
        "table_id": data.get("table_id"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.analytics.insert_one(metric)
    print(f"📊 AnalyticsService: Order creation tracked")


analytics_service = AnalyticsService()
