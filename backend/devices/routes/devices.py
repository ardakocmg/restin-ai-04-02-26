from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from core.database import db
from core.dependencies import get_current_user
from core.feature_flags import require_feature
from core.venue_config import get_venue_config
from devices.models import Device, DeviceCreate, DeviceUpdate
from devices.services import DeviceService

def create_devices_router():
    router = APIRouter(prefix="/devices", tags=["devices"])
    device_service = DeviceService(db)

    @router.post("", response_model=Device)
    async def create_device(
        device_data: DeviceCreate,
        user_agent: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(device_data.venue_id)
        require_feature(cfg, "DEVICES_PAIRING_ENABLED", "devices")
        
        device = await device_service.create_device(
            device_data,
            current_user["id"],
            user_agent
        )
        return device

    @router.get("", response_model=List[Device])
    async def list_devices(
        venue_id: str,
        device_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "DEVICES_PAIRING_ENABLED", "devices")
        
        devices = await device_service.list_devices(venue_id, device_type)
        return devices

    @router.get("/{device_id}", response_model=Device)
    async def get_device(
        device_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        device = await device_service.get_device(device_id, venue_id)
        if not device:
            raise HTTPException(404, "Device not found")
        return device

    @router.patch("/{device_id}", response_model=Device)
    async def update_device(
        device_id: str,
        venue_id: str,
        update_data: DeviceUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        device = await device_service.update_device(
            device_id,
            venue_id,
            update_data,
            current_user["id"]
        )
        if not device:
            raise HTTPException(404, "Device not found")
        return device

    return router
