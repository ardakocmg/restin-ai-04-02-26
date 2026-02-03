"""Event-driven architecture monitoring routes"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.dependencies import get_current_user
from services.event_bus import event_bus
from services.service_registry import service_registry
from services.order_service_events import order_service


def create_event_router():
    router = APIRouter(tags=["events"])

    @router.post("/orders/{order_id}/close-v2")
    async def close_order_v2(order_id: str, current_user: dict = Depends(get_current_user)):
        """
        🚀 NEW: Event-driven order close (microservice architecture)
        This endpoint demonstrates the new event-driven approach!
        """
        success, result = await order_service.close_order_event_driven(order_id, current_user)
        
        if not success:
            raise HTTPException(status_code=404, detail=result.get("error"))
        
        return result

    @router.get("/services/status")
    async def get_services_status(current_user: dict = Depends(get_current_user)):
        """Get status of all registered microservices"""
        services = await service_registry.list_all_services()
        return {"services": services, "event_bus_running": event_bus.running}

    @router.get("/events/outbox")
    async def get_event_outbox(
        status: str = None,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """View event outbox (for monitoring)"""
        query = {}
        if status:
            query["status"] = status
        
        events = await db.event_outbox.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
        return {"events": events, "count": len(events)}

    @router.get("/events/dlq")
    async def get_dead_letter_queue(
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """View dead letter queue (failed events)"""
        events = await db.event_dlq.find({}, {"_id": 0}).sort("moved_to_dlq_at", -1).limit(limit).to_list(limit)
        return {"events": events, "count": len(events)}

    return router
