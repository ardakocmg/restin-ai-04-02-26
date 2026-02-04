from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from core.database import db
from core.dependencies import get_current_user
from core.feature_flags import require_feature
from core.venue_config import get_venue_config
from kds.models import KdsTicketState, TicketStatus, KdsItemState, ItemStatus
from kds.services import KdsRuntimeService, KdsUndoService, KdsWaitTimeService

class BumpTicketRequest(BaseModel):
    new_status: TicketStatus

class BumpItemRequest(BaseModel):
    new_status: ItemStatus

def create_kds_runtime_router():
    router = APIRouter(prefix="/kds/runtime", tags=["kds-runtime"])
    runtime_service = KdsRuntimeService(db)
    undo_service = KdsUndoService(db)
    wait_time_service = KdsWaitTimeService()

    @router.get("/{station_key}/bootstrap")
    async def bootstrap_station(
        station_key: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all initial data needed for a KDS station screen"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.runtime")
        
        # Get station config
        station = await db.kds_stations.find_one(
            {"station_key": station_key, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not station:
            raise HTTPException(404, "Station not found")
        
        # Get station settings
        settings = await db.kds_station_settings.find_one(
            {"station_key": station_key, "venue_id": venue_id},
            {"_id": 0}
        )
        
        return {
            "station": station,
            "settings": settings,
            "ok": True
        }

    @router.get("/{station_key}/tickets", response_model=List[dict])
    async def get_tickets(
        station_key: str,
        venue_id: str,
        status: Optional[str] = None,
        include_completed: bool = False,
        current_user: dict = Depends(get_current_user)
    ):
        """Get tickets for a station with enhanced metadata"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.runtime")
        
        if include_completed:
            tickets = await runtime_service.get_completed_tickets(station_key, venue_id)
        else:
            tickets = await runtime_service.get_tickets_by_station(station_key, venue_id, status)
        
        # Enhance with wait time info
        enhanced_tickets = []
        for ticket in tickets:
            ticket_dict = ticket.model_dump()
            
            # Add wait time calculation
            wait_info = wait_time_service.calculate_wait_time(ticket.created_at)
            ticket_dict["wait_time"] = wait_info
            
            # Get order details
            order = await db.orders.find_one({"id": ticket.order_id}, {"_id": 0})
            if order:
                ticket_dict["order_details"] = {
                    "table_name": order.get("table_name"),
                    "server_name": order.get("server_name"),
                    "guest_count": order.get("guest_count"),
                    "items": order.get("items", [])
                }
            
            enhanced_tickets.append(ticket_dict)
        
        return enhanced_tickets

    @router.post("/{station_key}/tickets/{ticket_id}/bump")
    async def bump_ticket(
        station_key: str,
        ticket_id: str,
        venue_id: str,
        request: BumpTicketRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Move ticket to next status"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.runtime")
        
        await runtime_service.bump_ticket(
            ticket_id,
            venue_id,
            request.new_status,
            current_user["id"]
        )
        
        return {"ok": True}

    @router.post("/{station_key}/items/{item_id}/bump")
    async def bump_item(
        station_key: str,
        item_id: str,
        venue_id: str,
        request: BumpItemRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Move individual item to next status"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.runtime")
        
        await runtime_service.bump_item(
            item_id,
            venue_id,
            request.new_status,
            current_user["id"]
        )
        
        return {"ok": True}

    @router.post("/{station_key}/undo")
    async def undo_last_action(
        station_key: str,
        ticket_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Undo last ticket status change (within time window)"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.runtime")
        
        ticket = await undo_service.undo_ticket_status(
            ticket_id,
            venue_id,
            current_user["id"]
        )
        
        if not ticket:
            raise HTTPException(400, "Cannot undo - time window expired or invalid ticket")
        
        return {"ok": True, "ticket": ticket.model_dump()}

    @router.get("/{station_key}/items", response_model=List[KdsItemState])
    async def get_items_list(
        station_key: str,
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get items list view (alternative to ticket view)"""
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ITEMS_LIST_ENABLED", "kds.runtime")
        
        items = await runtime_service.get_items_by_station(station_key, venue_id, status)
        return items

    return router
