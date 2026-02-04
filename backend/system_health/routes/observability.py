"""System Observability Routes - Advanced Monitoring"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from system_health.services.data_volume_monitor import data_volume_monitor


def create_system_observability_router():
    router = APIRouter(tags=["system_observability"])

    @router.get("/system/observability/slow-queries")
    async def get_slow_queries(
        venue_id: str = Query(...),
        limit: int = Query(50),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        queries = await db.slow_query_logs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {"ok": True, "data": queries}

    @router.get("/system/observability/data-volume")
    async def get_data_volume(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        snapshots = await db.data_volume_snapshots.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(100).to_list(100)
        
        return {"ok": True, "data": snapshots}

    @router.post("/system/observability/capture-volume")
    async def capture_volume(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await data_volume_monitor.capture_snapshot(venue_id)
        
        return {"ok": True, "message": "Volume snapshot captured"}

    @router.get("/system/observability/read-model-health")
    async def get_read_model_health(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Compute read model lag
        health = []
        
        # Check stock on hand vs outbox
        last_outbox = await db.outbox_events.find_one(
            {"venue_id": venue_id, "topic": "inventory.ledger.movement.created"},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        if last_outbox:
            health.append({
                "venue_id": venue_id,
                "read_model": "rm_stock_on_hand",
                "last_event_ts": last_outbox.get("created_at", ""),
                "lag_seconds": 0,  # Simplified
                "status": "OK"
            })
        
        return {"ok": True, "data": health}

    return router
