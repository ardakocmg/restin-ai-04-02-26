"""
Table Merge Routes - Merge multiple tables into one
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from core.dependencies import get_current_user
from core.database import db
from datetime import datetime, timezone
from uuid import uuid4

class TableMergeRequest(BaseModel):
    source_tables: List[str]
    target_table: str
    venue_id: str

def create_table_merge_router():
    router = APIRouter(prefix="/pos/table-merge", tags=["pos", "tables"])
    
    @router.post("/merge")
    async def merge_tables(
        merge_req: TableMergeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Merge multiple tables into target table"""
        try:
            # Get all source orders
            source_orders = await db.orders.find(
                {
                    "venue_id": merge_req.venue_id,
                    "table_id": {"$in": merge_req.source_tables},
                    "status": "OPEN"
                },
                {"_id": 0}
            ).to_list(100)
            
            # Get target order or create new
            target_order = await db.orders.find_one(
                {
                    "venue_id": merge_req.venue_id,
                    "table_id": merge_req.target_table,
                    "status": "OPEN"
                },
                {"_id": 0}
            )
            
            # Merge all items into target order
            all_items = []
            total_guests = 0
            
            for order in source_orders:
                all_items.extend(order.get("items", []))
                total_guests += order.get("num_guests", 0)
            
            if target_order:
                # Update existing target order
                all_items.extend(target_order.get("items", []))
                total_guests += target_order.get("num_guests", 0)
                
                await db.orders.update_one(
                    {"id": target_order["id"]},
                    {
                        "$set": {
                            "items": all_items,
                            "num_guests": total_guests,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                merged_order_id = target_order["id"]
            else:
                # Create new order on target table
                new_order = {
                    "id": str(uuid4()),
                    "venue_id": merge_req.venue_id,
                    "table_id": merge_req.target_table,
                    "items": all_items,
                    "num_guests": total_guests,
                    "status": "OPEN",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.orders.insert_one(new_order)
                merged_order_id = new_order["id"]
            
            # Close source orders
            await db.orders.update_many(
                {
                    "venue_id": merge_req.venue_id,
                    "table_id": {"$in": merge_req.source_tables}
                },
                {
                    "$set": {
                        "status": "MERGED",
                        "merged_into": merged_order_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Log merge action
            merge_record = {
                "id": str(uuid4()),
                "venue_id": merge_req.venue_id,
                "source_tables": merge_req.source_tables,
                "target_table": merge_req.target_table,
                "merged_order_id": merged_order_id,
                "performed_by": current_user.get("id"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.table_merges.insert_one(merge_record.copy())
            
            return {
                "success": True,
                "merged_order_id": merged_order_id,
                "total_items": len(all_items),
                "total_guests": total_guests
            }
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/history/{venue_id}")
    async def get_merge_history(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get table merge history"""
        history = await db.table_merges.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        return {
            "success": True,
            "history": history
        }
    
    return router
