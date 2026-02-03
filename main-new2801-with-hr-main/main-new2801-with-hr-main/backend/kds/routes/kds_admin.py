from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from core.database import db
from core.dependencies import get_current_user
from core.feature_flags import require_feature
from core.venue_config import get_venue_config
from kds.models import KdsStation, KdsStationCreate, KdsStationUpdate, KdsStationSettings, KdsStationSettingsUpdate
from kds.services import KdsStationService

class RoutingUpdateRequest(BaseModel):
    routing_rules: list

def create_kds_admin_router():
    router = APIRouter(prefix="/kds/stations", tags=["kds-admin"])
    station_service = KdsStationService(db)

    @router.post("", response_model=KdsStation)
    async def create_station(
        station_data: KdsStationCreate,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(station_data.venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.stations")
        
        station = await station_service.create_station(
            station_data,
            current_user["id"]
        )
        return station

    @router.get("", response_model=List[KdsStation])
    async def list_stations(
        venue_id: str,
        enabled_only: bool = False,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "KDS_ENABLED", "kds.stations")
        
        stations = await station_service.list_stations(venue_id, enabled_only)
        return stations

    @router.get("/{station_key}", response_model=KdsStation)
    async def get_station(
        station_key: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        station = await station_service.get_station(station_key, venue_id)
        if not station:
            raise HTTPException(404, "Station not found")
        return station

    @router.patch("/{station_key}", response_model=KdsStation)
    async def update_station(
        station_key: str,
        venue_id: str,
        update_data: KdsStationUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        station = await station_service.update_station(
            station_key,
            venue_id,
            update_data,
            current_user["id"]
        )
        if not station:
            raise HTTPException(404, "Station not found")
        return station

    @router.patch("/{station_key}/routing")
    async def update_routing(
        station_key: str,
        venue_id: str,
        request: RoutingUpdateRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await station_service.update_routing(
            station_key,
            venue_id,
            request.routing_rules,
            current_user["id"]
        )
        return {"ok": True}

    @router.get("/{station_key}/settings", response_model=KdsStationSettings)
    async def get_station_settings(
        station_key: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        # Get from settings collection or return defaults
        doc = await db.kds_station_settings.find_one(
            {"station_key": station_key, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if doc:
            return KdsStationSettings(**doc)
        
        # Return defaults
        return KdsStationSettings(station_key=station_key)

    @router.patch("/{station_key}/settings")
    async def update_station_settings(
        station_key: str,
        venue_id: str,
        settings: KdsStationSettingsUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        update_dict = {k: v for k, v in settings.model_dump().items() if v is not None}
        
        if update_dict:
            await db.kds_station_settings.update_one(
                {"station_key": station_key, "venue_id": venue_id},
                {"$set": update_dict},
                upsert=True
            )
        
        return {"ok": True}

    @router.post("/{station_key}/reset")
    async def reset_station(
        station_key: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await station_service.reset_station(
            station_key,
            venue_id,
            current_user["id"]
        )
        return {"ok": True, "message": "Station reset successfully"}

    return router
