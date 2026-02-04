"""Stock Count Routes (Physical Inventory)"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.inventory_updates import StockCount, StockCountItem, StockCountStatus
from services.audit_service import create_audit_log

def create_inventory_counts_router():
    router = APIRouter(tags=["inventory-counts"])

    @router.get("/venues/{venue_id}/inventory/counts", response_model=List[StockCount])
    async def list_stock_counts(
        venue_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        counts = await db.stock_counts.find(query).sort("started_at", -1).limit(limit).to_list(limit)
        return counts

    @router.get("/venues/{venue_id}/inventory/counts/{count_id}", response_model=StockCount)
    async def get_stock_count(
        venue_id: str,
        count_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        count = await db.stock_counts.find_one({"id": count_id, "venue_id": venue_id})
        if not count:
            raise HTTPException(404, "Stock count not found")
        return count

    @router.post("/venues/{venue_id}/inventory/counts", response_model=StockCount)
    async def val_stock_count(
        venue_id: str,
        data: dict,  # { "items": [...] } optional init
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Create new session
        count = StockCount(
            venue_id=venue_id,
            branch_id=venue_id, # Simplify for flattened scope
            status=StockCountStatus.DRAFT,
            performed_by_id=current_user["id"],
            items=[]
        )
        
        await db.stock_counts.insert_one(count.model_dump())
        await create_audit_log(venue_id, current_user["id"], current_user.get("name"), "create", "stock_count", count.id, {})
        return count

    @router.put("/venues/{venue_id}/inventory/counts/{count_id}/items")
    async def update_count_items(
        venue_id: str,
        count_id: str,
        items: List[StockCountItem],
        current_user: dict = Depends(get_current_user)
    ):
        """Update items in a draft count"""
        await check_venue_access(current_user, venue_id)
        
        count = await db.stock_counts.find_one({"id": count_id, "venue_id": venue_id})
        if not count:
            raise HTTPException(404, "Stock count not found")
        
        if count["status"] == StockCountStatus.APPROVED:
            raise HTTPException(400, "Cannot edit approved count")
            
        # Convert Pydantic models to dicts
        items_dict = [item.model_dump() for item in items]
        
        await db.stock_counts.update_one(
            {"id": count_id},
            {"$set": {"items": items_dict, "status": StockCountStatus.REVIEW}}
        )
        
        return {"message": "Items updated"}

    @router.post("/venues/{venue_id}/inventory/counts/{count_id}/finalize")
    async def finalize_stock_count(
        venue_id: str,
        count_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Apply variance to actual stock"""
        await check_venue_access(current_user, venue_id)
        
        count = await db.stock_counts.find_one({"id": count_id, "venue_id": venue_id})
        if not count:
            raise HTTPException(404, "Stock count not found")
        
        if count["status"] == StockCountStatus.APPROVED:
            return {"message": "Already approved"}
            
        items = count["items"]
        
        # Process each item variance
        for item in items:
            # item has: ingredient_id, actual_base, expected_base
            # Logic: Update current_stock to actual_base
            # Create Ledger Entry for Variance
            
            variance = item["actual_base"] - item["expected_base"]
            
            if variance != 0:
                # Update Inventory
                await db.inventory_items.update_one(
                    {"id": item["ingredient_id"]},
                    {"$set": {"current_stock": item["actual_base"]}}
                )
                
                # Ledger
                # This requires computing hash etc. reusing logic...
                # For now, minimal ledger entry
                # ideally we call a service method
                pass 
                
        await db.stock_counts.update_one(
            {"id": count_id},
            {"$set": {
                "status": StockCountStatus.APPROVED, 
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Stock count finalized and inventory updated"}

    return router
