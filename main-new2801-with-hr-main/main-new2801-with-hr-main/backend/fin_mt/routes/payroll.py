"""Malta Finance Routes"""
from fastapi import APIRouter, Depends, Query

from core.dependencies import get_current_user, check_venue_access
from fin_mt.services.payroll_engine import payroll_engine


def create_fin_mt_router():
    router = APIRouter(tags=["fin_mt"])

    @router.post("/fin-mt/payroll/calculate")
    async def calculate_payroll(
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        gross = data.get("gross", 0)
        
        # Get current tax table (would be versioned in production)
        tax_table = {
            "bands": [
                {"min": 0, "max": 9100, "rate": 0},
                {"min": 9101, "max": 14500, "rate": 15},
                {"min": 14501, "max": 19500, "rate": 25},
                {"min": 19501, "max": 60000, "rate": 25},
                {"min": 60001, "max": 999999, "rate": 35}
            ]
        }
        
        result = payroll_engine.calculate_net_from_gross(gross, tax_table)
        
        return {"ok": True, "data": result}

    return router
