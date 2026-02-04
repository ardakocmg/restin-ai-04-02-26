"""Inventory routes - stock management, ledger, items"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

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

    @router.post("/venues/{venue_id}/inventory/transfer")
    async def transfer_inventory(
        venue_id: str,
        transfer_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Transfer inventory from one venue to another.
        transfer_data: {
            "item_id": str,
            "to_venue_id": str,
            "quantity": float,
            "reason": str (optional)
        }
        """
        await check_venue_access(current_user, venue_id)
        
        from_venue_id = venue_id
        to_venue_id = transfer_data["to_venue_id"]
        item_id = transfer_data["item_id"]
        quantity = float(transfer_data["quantity"])
        reason = transfer_data.get("reason", "Stock Transfer")
        
        # 1. Verify source item
        source_item = await db.inventory_items.find_one(
            {"id": item_id, "venue_id": from_venue_id},
            {"_id": 0}
        )
        if not source_item:
            print(f"DEBUG: Transfer Source Item Not Found. ID: {item_id}, Venue: {from_venue_id}")
            raise HTTPException(404, "Source item not found")
        
        print(f"DEBUG: Transfer Source Item: {source_item.get('id')} Stock: {source_item.get('current_stock')} Req: {quantity}")

        if source_item["current_stock"] < quantity:
            raise HTTPException(400, f"Insufficient stock. Available: {source_item['current_stock']}")

        # 2. Verify destination venue exists (optional, but good practice)
        # Assuming we trust the ID for now or it's checked by permissions eventually
        
        # 3. Handle Destination Item (Find or Create)
        # We try to find an item with the same SKU in the destination venue
        dest_item = await db.inventory_items.find_one(
            {"venue_id": to_venue_id, "sku": source_item["sku"]},
            {"_id": 0}
        )
        
        dest_item_id = None
        
        if dest_item:
            dest_item_id = dest_item["id"]
        else:
            # Create the item in destination if it doesn't exist
            # This is a simplification; in strict systems, we might require it to exist first.
            # But for usability, auto-creating mirrors is helpful.
            dest_item_data = source_item.copy()
            dest_item_data["id"] = str(uuid.uuid4())
            dest_item_data["venue_id"] = to_venue_id
            dest_item_data["current_stock"] = 0
            dest_item_data["min_stock"] = 0
            # Reset logs/history
            if "created_at" in dest_item_data:
                 dest_item_data["created_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.inventory_items.insert_one(dest_item_data)
            dest_item_id = dest_item_data["id"]

        # 4. Create Ledger Entries (Atomic-ish)
        
        # OUT from Source
        # We reuse the create_ledger_entry logic or call it directly? 
        # Calling directly via function call would be cleaner but let's just insert for speed/separation
        
        # Source Ledger
        last_entry_src = await db.stock_ledger.find_one(
            {"venue_id": from_venue_id}, sort=[("created_at", -1)]
        )
        prev_hash_src = last_entry_src["entry_hash"] if last_entry_src else "genesis"
        
        entry_data_src = {
            "item_id": item_id,
            "action": LedgerAction.OUT,
            "quantity": quantity,
            "reason": f"Transfer to {to_venue_id}"
        }
        entry_hash_src = compute_hash(entry_data_src, prev_hash_src)
        
        entry_src = StockLedgerEntry(
            venue_id=from_venue_id,
            item_id=item_id,
            action=LedgerAction.OUT,
            quantity=quantity,
            reason=reason,
            user_id=current_user["id"],
            prev_hash=prev_hash_src,
            entry_hash=entry_hash_src
        )
        await db.stock_ledger.insert_one(entry_src.model_dump())
        await db.inventory_items.update_one(
            {"id": item_id},
            {"$inc": {"current_stock": -quantity}}
        )

        # IN to Destination
        last_entry_dest = await db.stock_ledger.find_one(
            {"venue_id": to_venue_id}, sort=[("created_at", -1)]
        )
        prev_hash_dest = last_entry_dest["entry_hash"] if last_entry_dest else "genesis"
        
        entry_data_dest = {
            "item_id": dest_item_id,
            "action": LedgerAction.IN,
            "quantity": quantity,
            "reason": f"Transfer from {from_venue_id}"
        }
        entry_hash_dest = compute_hash(entry_data_dest, prev_hash_dest)
        
        entry_dest = StockLedgerEntry(
            venue_id=to_venue_id,
            item_id=dest_item_id,
            action=LedgerAction.IN,
            quantity=quantity,
            reason=reason,
            user_id=current_user["id"],
            prev_hash=prev_hash_dest,
            entry_hash=entry_hash_dest
        )
        await db.stock_ledger.insert_one(entry_dest.model_dump())
        await db.inventory_items.update_one(
            {"id": dest_item_id},
            {"$inc": {"current_stock": quantity}}
        )
        
        return {"message": "Transfer successful", "source_entry": entry_src.model_dump(), "dest_entry": entry_dest.model_dump()}

    return router
