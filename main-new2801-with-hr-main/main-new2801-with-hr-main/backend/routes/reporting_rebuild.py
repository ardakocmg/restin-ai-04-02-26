"""Reporting Rebuild Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.errors import forbidden
from models import UserRole


def create_reporting_rebuild_router():
    router = APIRouter(tags=["reporting_rebuild"])

    @router.post("/reporting/rebuild")
    async def rebuild_read_models(
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        """Rebuild read models from events (admin only)"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.PRODUCT_OWNER]:
            raise forbidden("Admin access required")
        
        await check_venue_access(current_user, venue_id)
        
        topics = data.get("topics")
        truncate = data.get("truncate", False)
        
        # Truncate if requested
        if truncate:
            await db.rm_stock_on_hand.delete_many({"venue_id": venue_id})
            await db.rm_neg_stock_diagnosis.delete_many({"venue_id": venue_id})
        
        # Replay events
        query = {"venue_id": venue_id}
        if topics:
            query["topic"] = {"$in": topics}
        
        events = await db.outbox_events.find(query, {"_id": 0}).to_list(10000)
        
        # Process events to rebuild
        from workers.outbox_consumer import outbox_consumer
        
        rebuilt = 0
        for event in events:
            try:
                await outbox_consumer._process_event(event)
                rebuilt += 1
            except Exception as e:
                print(f"Rebuild error: {e}")
        
        return {
            "ok": True,
            "message": f"Rebuilt {rebuilt} events",
            "total_events": len(events)
        }

    return router
