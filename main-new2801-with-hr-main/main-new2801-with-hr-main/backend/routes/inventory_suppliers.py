"""Inventory Suppliers Routes"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.supplier import SupplierCreate
from services.inventory_suppliers.suppliers_service import suppliers_service


def create_inventory_suppliers_router():
    router = APIRouter(tags=["inventory_suppliers"])

    @router.get("/inventory/suppliers")
    async def list_suppliers(
        venue_id: str,
        include_archived: bool = False,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        suppliers = await suppliers_service.list_suppliers(venue_id, include_archived)
        return suppliers

    @router.post("/inventory/suppliers")
    async def create_supplier(
        data: SupplierCreate,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, data.venue_id)
        supplier = await suppliers_service.create_supplier(
            data.model_dump(),
            data.venue_id,
            current_user["id"]
        )
        return supplier

    @router.put("/inventory/suppliers/{supplier_id}")
    async def update_supplier(
        supplier_id: str,
        data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        await check_venue_access(current_user, supplier["venue_id"])
        result = await suppliers_service.update_supplier(supplier_id, data)
        return result

    @router.post("/inventory/suppliers/{supplier_id}/archive")
    async def archive_supplier(
        supplier_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        supplier = await db.suppliers.find_one({"id": supplier_id}, {"_id": 0})
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        await check_venue_access(current_user, supplier["venue_id"])
        result = await suppliers_service.archive_supplier(supplier_id)
        return result

    return router
