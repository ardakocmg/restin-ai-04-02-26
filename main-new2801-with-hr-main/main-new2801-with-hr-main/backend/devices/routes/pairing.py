from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from core.database import db
from core.dependencies import get_current_user
from core.feature_flags import require_feature
from core.venue_config import get_venue_config
from devices.models import DevicePairingCode
from devices.services import PairingService, DeviceService

class PairDeviceRequest(BaseModel):
    venue_id: str
    code: str
    device_id: str

def create_pairing_router():
    router = APIRouter(prefix="/devices/pairing", tags=["devices"])
    pairing_service = PairingService(db)
    device_service = DeviceService(db)

    @router.post("/codes", response_model=DevicePairingCode)
    async def generate_pairing_code(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "DEVICES_PAIRING_ENABLED", "devices.pairing")
        
        code = await pairing_service.generate_pairing_code(
            venue_id,
            current_user["id"]
        )
        return code

    @router.get("/codes", response_model=List[DevicePairingCode])
    async def list_active_codes(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        codes = await pairing_service.list_active_codes(venue_id)
        return codes

    @router.post("/pair")
    async def pair_device(
        request: PairDeviceRequest,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(request.venue_id)
        require_feature(cfg, "DEVICES_PAIRING_ENABLED", "devices.pairing")
        
        # Validate and use code
        valid = await pairing_service.validate_and_use_code(
            request.venue_id,
            request.code,
            request.device_id
        )
        
        if not valid:
            raise HTTPException(400, "Invalid or expired pairing code")
        
        # Trust the device
        await device_service.trust_device(
            request.device_id,
            request.venue_id,
            True,
            current_user["id"]
        )
        
        return {"ok": True, "message": "Device paired successfully"}

    return router
