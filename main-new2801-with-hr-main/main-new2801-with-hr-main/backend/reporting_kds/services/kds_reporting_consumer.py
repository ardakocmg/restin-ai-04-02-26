from datetime import datetime, timezone
from typing import Optional

class KdsReportingConsumer:
    """Consumer for KDS events to build reporting read models"""
    
    def __init__(self, db):
        self.db = db
        self.stats_col = db.rm_kds_item_stats_daily

    async def consume_item_completed_event(self, event: dict):
        """
        Process kds.item_status_changed event when item is COMPLETED.
        Calculate production time and update daily stats.
        """
        payload = event.get("payload", {})
        
        if payload.get("new_status") != "COMPLETED":
            return
        
        item_id = payload.get("item_id")
        station_key = payload.get("station_key")
        venue_id = event.get("venue_id")
        
        # Get item state to calculate production time
        item_state = await self.db.kds_item_states.find_one(
            {"item_id": item_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not item_state:
            return
        
        # Calculate production time (preparing_at to completed_at)
        if not item_state.get("preparing_at") or not item_state.get("completed_at"):
            return
        
        start = datetime.fromisoformat(item_state["preparing_at"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(item_state["completed_at"].replace("Z", "+00:00"))
        production_time_ms = int((end - start).total_seconds() * 1000)
        
        # Get item details from order
        order = await self.db.orders.find_one(
            {"id": item_state["order_id"]},
            {"_id": 0}
        )
        
        item_name = "Unknown"
        if order:
            for order_item in order.get("items", []):
                if order_item.get("id") == item_id:
                    item_name = order_item.get("menu_item_name", "Unknown")
                    break
        
        # Update daily stats
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Upsert stats document
        existing = await self.stats_col.find_one({
            "venue_id": venue_id,
            "day": day,
            "item_id": item_id,
            "station_key": station_key
        }, {"_id": 0})
        
        if existing:
            # Update existing stats
            new_count = existing["produced_count"] + 1
            new_total = existing["total_time_ms"] + production_time_ms
            new_average = new_total // new_count
            
            await self.stats_col.update_one(
                {
                    "venue_id": venue_id,
                    "day": day,
                    "item_id": item_id,
                    "station_key": station_key
                },
                {"$set": {
                    "produced_count": new_count,
                    "fastest_ms": min(existing.get("fastest_ms", production_time_ms), production_time_ms),
                    "slowest_ms": max(existing.get("slowest_ms", production_time_ms), production_time_ms),
                    "average_ms": new_average,
                    "total_time_ms": new_total,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Create new stats document
            await self.stats_col.insert_one({
                "venue_id": venue_id,
                "day": day,
                "item_id": item_id,
                "item_name": item_name,
                "station_key": station_key,
                "produced_count": 1,
                "fastest_ms": production_time_ms,
                "slowest_ms": production_time_ms,
                "average_ms": production_time_ms,
                "total_time_ms": production_time_ms,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
