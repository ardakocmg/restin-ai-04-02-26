from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from core.database import db
from core.dependencies import get_current_user
from core.feature_flags import require_feature
from core.venue_config import get_venue_config
from reporting_kds.read_models import RmKdsItemStatsDaily

def create_kds_reports_router():
    router = APIRouter(prefix="/reports/kds", tags=["kds-reports"])

    @router.get("/item-stats", response_model=List[RmKdsItemStatsDaily])
    async def get_item_stats(
        venue_id: str,
        day: Optional[str] = None,
        station_key: Optional[str] = None,
        item_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get KDS item production statistics"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.reports")
        
        query = {"venue_id": venue_id}
        
        if day:
            query["day"] = day
        
        if station_key:
            query["station_key"] = station_key
        
        if item_id:
            query["item_id"] = item_id
        
        cursor = db.rm_kds_item_stats_daily.find(query, {"_id": 0}).sort("day", -1)
        docs = await cursor.to_list(1000)
        
        return [RmKdsItemStatsDaily(**doc) for doc in docs]

    @router.get("/station-summary")
    async def get_station_summary(
        venue_id: str,
        station_key: str,
        day: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get summary statistics for a station"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.reports")
        
        query = {"venue_id": venue_id, "station_key": station_key}
        if day:
            query["day"] = day
        
        cursor = db.rm_kds_item_stats_daily.find(query, {"_id": 0})
        docs = await cursor.to_list(1000)
        
        if not docs:
            return {
                "total_items": 0,
                "average_time_minutes": 0,
                "fastest_item": None,
                "slowest_item": None
            }
        
        total_items = sum(doc["produced_count"] for doc in docs)
        
        # Calculate weighted average
        total_time = sum(doc["total_time_ms"] for doc in docs)
        avg_time_ms = total_time // total_items if total_items > 0 else 0
        
        # Find fastest and slowest
        fastest = min(docs, key=lambda x: x.get("fastest_ms", float('inf')))
        slowest = max(docs, key=lambda x: x.get("slowest_ms", 0))
        
        return {
            "total_items": total_items,
            "average_time_minutes": round(avg_time_ms / 60000, 2),
            "fastest_item": {
                "name": fastest["item_name"],
                "time_minutes": round(fastest.get("fastest_ms", 0) / 60000, 2)
            },
            "slowest_item": {
                "name": slowest["item_name"],
                "time_minutes": round(slowest.get("slowest_ms", 0) / 60000, 2)
            }
        }

    return router
