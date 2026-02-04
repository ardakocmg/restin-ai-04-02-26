"""Diagnostic Routes"""
from fastapi import APIRouter, Depends, Query

from core.dependencies import get_current_user, check_venue_access
from system_health.services.diagnostic_service import diagnostic_service


def create_system_diagnostic_router():
    router = APIRouter(tags=["system_diagnostic"])

    @router.post("/system/diagnostics/run")
    async def run_diagnostics(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Run complete system diagnostics wizard"""
        await check_venue_access(current_user, venue_id)
        
        report = await diagnostic_service.run_diagnostics(venue_id)
        
        return {"ok": True, "data": report}

    return router
