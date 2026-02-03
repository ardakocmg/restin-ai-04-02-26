"""Inventory routes - stock management, ledger, items"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import InventoryItem, InventoryItemCreate, LedgerAction, StockLedgerEntry
from services.audit_service import create_audit_log
from utils.helpers import compute_hash


def create_inventory_router():
    router = APIRouter(tags=["inventory"])

    @router.get("/venues/{venue_id}/inventory")
    async def list_inventory(
        venue_id: str,
        search: Optional[str] = None,
        unit: Optional[str] = None,
        current_stock_min: Optional[float] = None,
        current_stock_max: Optional[float] = None,
        min_stock_min: Optional[float] = None,
        min_stock_max: Optional[float] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "updated_at",
        sort_dir: str = "desc",
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"sku": {"$regex": search, "$options": "i"}}
            ]
        if unit:
            units = [item.strip() for item in unit.split(",") if item.strip()]
            if units:
                query["unit"] = {"$in": units}
        if current_stock_min is not None or current_stock_max is not None:
            query["current_stock"] = {}
            if current_stock_min is not None:
                query["current_stock"]["$gte"] = current_stock_min
            if current_stock_max is not None:
                query["current_stock"]["$lte"] = current_stock_max
        if min_stock_min is not None or min_stock_max is not None:
            query["min_stock"] = {}
            if min_stock_min is not None:
                query["min_stock"]["$gte"] = min_stock_min
            if min_stock_max is not None:
                query["min_stock"]["$lte"] = min_stock_max

        sort_fields = {
            "name": "name",
            "sku": "sku",
            "unit": "unit",
            "current_stock": "current_stock",
            "min_stock": "min_stock",
            "updated_at": "updated_at"
        }
        sort_field = sort_fields.get(sort_by, "updated_at")
        sort_direction = -1 if sort_dir == "desc" else 1

        total = await db.inventory_items.count_documents(query)
        cursor = db.inventory_items.find(query, {"_id": 0}).sort(sort_field, sort_direction)
        cursor = cursor.skip((page - 1) * page_size).limit(page_size)
        items = await cursor.to_list(page_size)
        return {"items": items, "total": total}

    @router.post("/inventory/items", response_model=InventoryItem)
    async def create_inventory_item(data: InventoryItemCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        item = InventoryItem(**data.model_dump())
        await db.inventory_items.insert_one(item.model_dump())
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "inventory_item", item.id, {"name": item.name}
        )
        
        return item

    @router.post("/inventory/ledger")
    async def create_ledger_entry(
        item_id: str,
        action: LedgerAction,
        quantity: float,
        reason: Optional[str] = None,
        lot_number: Optional[str] = None,
        expiry_date: Optional[str] = None,
        po_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        item = await db.inventory_items.find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        await check_venue_access(current_user, item["venue_id"])
        
        last_entry = await db.stock_ledger.find_one(
            {"venue_id": item["venue_id"]},
            sort=[("created_at", -1)],
            projection={"_id": 0, "entry_hash": 1}
        )
        prev_hash = last_entry["entry_hash"] if last_entry else "genesis"
        
        entry_data = {
            "item_id": item_id,
            "action": action,
            "quantity": quantity,
            "reason": reason
        }
        entry_hash = compute_hash(entry_data, prev_hash)
        
        entry = StockLedgerEntry(
            venue_id=item["venue_id"],
            item_id=item_id,
            action=action,
            quantity=quantity,
            lot_number=lot_number,
            expiry_date=expiry_date,
            reason=reason,
            po_id=po_id,
            user_id=current_user["id"],
            prev_hash=prev_hash,
            entry_hash=entry_hash
        )
        
        await db.stock_ledger.insert_one(entry.model_dump())
        
        stock_delta = quantity if action in [LedgerAction.IN] else -quantity
        if action == LedgerAction.ADJUST:
            await db.inventory_items.update_one(
                {"id": item_id},
                {"$set": {"current_stock": quantity}}
            )
        else:
            await db.inventory_items.update_one(
                {"id": item_id},
                {"$inc": {"current_stock": stock_delta}}
            )
        
        await create_audit_log(
            item["venue_id"], current_user["id"], current_user["name"],
            f"inventory_{action}", "inventory_item", item_id,
            {"quantity": quantity, "reason": reason}
        )
        
        return entry.model_dump()

    @router.get("/venues/{venue_id}/inventory/ledger")
    async def get_ledger(
        venue_id: str,
        item_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if item_id:
            query["item_id"] = item_id
        
        entries = await db.stock_ledger.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return entries

    return router
