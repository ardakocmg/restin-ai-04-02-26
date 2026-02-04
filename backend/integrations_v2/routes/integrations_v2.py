"""Integrations v2 Routes - Delivery Aggregators"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_integrations_v2_router():
    router = APIRouter(tags=["integrations_v2"])

    @router.get("/integrations/delivery-orders")
    async def list_delivery_orders(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        orders = await db.delivery_orders.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": orders}

    @router.get("/integrations/menu-mappings")
    async def list_menu_mappings(
        venue_id: str = Query(...),
        connector_key: str = Query(None),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if connector_key:
            query["connector_key"] = connector_key
        
        mappings = await db.external_menu_maps.find(
            query,
            {"_id": 0}
        ).to_list(500)
        
        return {"ok": True, "data": mappings}

    @router.get("/integrations/capabilities")
    async def list_connector_capabilities(
        current_user: dict = Depends(get_current_user)
    ):
        """Get capability matrix for all connectors"""
        
        # Hardcoded capability matrix (production would be in DB)
        capabilities = [
            {
                "connector_key": "WOLT",
                "supports": {
                    "order_webhooks": True,
                    "menu_push_api": True,
                    "availability_updates": True,
                    "order_accept_reject": True,
                    "settlement_reports": True
                },
                "constraints": {"async_menu_processing": True}
            },
            {
                "connector_key": "BOLT_FOOD",
                "supports": {
                    "order_webhooks": True,
                    "menu_push_api": True,
                    "availability_updates": True,
                    "order_accept_reject": True
                }
            },
            {
                "connector_key": "DELIVEROO",
                "supports": {
                    "order_webhooks": True,
                    "menu_push_api": True,
                    "order_ready_picked": True
                }
            },
            {
                "connector_key": "UBER_EATS",
                "supports": {
                    "order_webhooks": True,
                    "cancellations": True
                }
            },
            {
                "connector_key": "GLOVO",
                "supports": {
                    "order_pull_api": True,
                    "menu_push_api": True
                }
            },
            {
                "connector_key": "JET",
                "supports": {
                    "menu_push_api": True,
                    "order_webhooks": True
                }
            }
        ]
        
        return {"ok": True, "data": capabilities}

    return router
