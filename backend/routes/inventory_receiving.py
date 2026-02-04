"""Inventory Receiving Routes"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.receiving_grn import GRNCreate
from services.inventory_suppliers.receiving_service import receiving_service


def create_inventory_receiving_router():
    router = APIRouter(tags=["inventory_receiving"])

    @router.get("/inventory/receiving/grns")
    async def list_grns(
        venue_id: str,
        supplier_id: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if supplier_id:
            query["supplier_id"] = supplier_id
        
        grns = await db.receiving_grns.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        return grns

    @router.post("/inventory/receiving/grn")
    async def create_grn(
        data: GRNCreate,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, data.venue_id)
        success, result = await receiving_service.create_grn(
            data.model_dump(),
            current_user["id"]
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result

    @router.post("/inventory/receiving/grn/{grn_id}/post")
    async def post_grn(
        grn_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Post GRN to ledger (idempotent)"""
        grn = await db.receiving_grns.find_one({"id": grn_id}, {"_id": 0})
        if not grn:
            raise HTTPException(status_code=404, detail="GRN not found")
        
        await check_venue_access(current_user, grn["venue_id"])
        success, result = await receiving_service.post_grn(grn_id)
        
        if not success:
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result

    return router
