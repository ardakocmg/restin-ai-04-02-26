"""Collab Tickets Routes - Productization"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_collab_tickets_router():
    router = APIRouter(tags=["collab_tickets"])

    @router.get("/collab/tickets/queues")
    async def list_queues(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        queues = await db.ticket_queues.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(50)
        
        return {"ok": True, "data": queues}

    @router.get("/collab/tickets/macros")
    async def list_macros(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        macros = await db.ticket_macros.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(100)
        
        return {"ok": True, "data": macros}

    return router
