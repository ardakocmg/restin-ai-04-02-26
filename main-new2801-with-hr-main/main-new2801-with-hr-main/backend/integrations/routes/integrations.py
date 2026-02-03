"""Integrations Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_integrations_router():
    router = APIRouter(tags=["integrations"])

    @router.get("/integrations/connectors")
    async def list_connectors(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        connectors = await db.connectors_registry.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(50)
        
        return {"ok": True, "data": connectors}

    @router.get("/integrations/inbound")
    async def list_inbound_events(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        events = await db.inbound_events.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("received_at", -1).to_list(100)
        
        return {"ok": True, "data": events}

    @router.get("/integrations/outbound")
    async def list_outbound_events(
        venue_id: str = Query(...),
        status: str = Query(None),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        events = await db.outbound_events.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": events}

    @router.get("/integrations/health")
    async def get_integration_health(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        health = await db.integration_health.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(50)
        
        return {"ok": True, "data": health}

    return router
