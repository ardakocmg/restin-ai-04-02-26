"""Analytics Routes"""
from fastapi import APIRouter, HTTPException, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


def create_analytics_router():
    router = APIRouter(tags=["analytics"])

    @router.get("/analytics/dashboards")
    async def list_dashboards(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "analytics", "analytics")
        
        dashboards = await db.analytics_dashboards.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        return {"ok": True, "data": dashboards}

    @router.get("/analytics/metrics")
    async def get_metrics(
        venue_id: str = Query(...),
        from_date: str = Query(None, alias="from"),
        to_date: str = Query(None, alias="to"),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "analytics", "analytics")
        
        # Get metric snapshots
        query = {"venue_id": venue_id}
        if from_date:
            query["ts"] = {"$gte": from_date}
        if to_date:
            query.setdefault("ts", {})["$lte"] = to_date
        
        snapshots = await db.metric_snapshots.find(query, {"_id": 0}).to_list(1000)
        
        return {"ok": True, "data": snapshots}

    return router
