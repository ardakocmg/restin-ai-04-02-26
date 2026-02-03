"""Finance Provider Routes - Vendor Agnostic"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_finance_provider_router():
    router = APIRouter(tags=["finance_provider"])

    @router.get("/finance-provider/settings")
    async def get_provider_settings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        settings = await db.finance_provider_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )
        
        if not settings:
            # Return default
            settings = {
                "venue_id": venue_id,
                "enabled": False,
                "mode": "EXPORT_ONLY",
                "provider_label": "External Finance Provider"
            }
        
        return {"ok": True, "data": settings}

    @router.put("/finance-provider/settings")
    async def update_provider_settings(
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        from datetime import datetime, timezone
        data["venue_id"] = venue_id
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.finance_provider_settings.update_one(
            {"venue_id": venue_id},
            {"$set": data},
            upsert=True
        )
        
        return {"ok": True, "message": "Settings updated"}

    @router.get("/finance-provider/mappings/employees")
    async def list_employee_mappings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        mappings = await db.provider_employee_maps.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(500)
        
        return {"ok": True, "data": mappings}

    @router.get("/finance-provider/mappings/coa")
    async def list_coa_mappings(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        mappings = await db.provider_coa_maps.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(500)
        
        return {"ok": True, "data": mappings}

    return router
