"""Devices & IoT Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_devices_iot_router():
    router = APIRouter(tags=["devices_iot"])

    @router.get("/devices-iot")
    async def list_devices(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        devices = await db.devices_inventory.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(200)
        
        return {"ok": True, "data": devices}

    @router.get("/devices-iot/alerts")
    async def list_alerts(
        venue_id: str = Query(...),
        status: str = Query("OPEN"),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        alerts = await db.device_alerts.find(
            {"venue_id": venue_id, "status": status},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": alerts}

    return router
