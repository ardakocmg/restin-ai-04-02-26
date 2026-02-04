"""
Bill Split Routes - Order payment splitting
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from core.dependencies import get_current_user
from core.database import db
from datetime import datetime, timezone
from uuid import uuid4

class SplitRequest(BaseModel):
    order_id: str
    split_type: str  # 'equal' | 'by_item' | 'custom'
    number_of_splits: Optional[int] = 2
    item_allocations: Optional[dict] = None
    custom_amounts: Optional[List[float]] = None

def create_bill_split_router():
    router = APIRouter(prefix="/pos/bill-split", tags=["pos", "bill-split"])
    
    @router.post("/split")
    async def split_bill(
        split_req: SplitRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Split bill into multiple payments"""
        try:
            # Get order
            order = await db.orders.find_one(
                {"id": split_req.order_id},
                {"_id": 0}
            )
            
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            total = order.get("totals", {}).get("grand_total", 0)
            splits = []
            
            if split_req.split_type == 'equal':
                # Equal split
                amount_per_person = total / split_req.number_of_splits
                for i in range(split_req.number_of_splits):
                    splits.append({
                        "split_id": f"split_{i+1}",
                        "amount": amount_per_person,
                        "items": "equal"
                    })
            
            elif split_req.split_type == 'by_item':
                # By item allocation
                # Group items by allocation
                pass  # Implementation depends on item allocation logic
            
            elif split_req.split_type == 'custom':
                # Custom amounts
                for i, amount in enumerate(split_req.custom_amounts or []):
                    splits.append({
                        "split_id": f"split_{i+1}",
                        "amount": amount
                    })
            
            # Store split record
            split_record = {
                "id": str(uuid4()),
                "order_id": split_req.order_id,
                "split_type": split_req.split_type,
                "splits": splits,
                "created_by": current_user.get("id"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert without _id in response
            split_record_copy = split_record.copy()
            await db.bill_splits.insert_one(split_record_copy)
            
            return {
                "success": True,
                "split": split_record
            }
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/order/{order_id}")
    async def get_order_splits(
        order_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get splits for an order"""
        splits = await db.bill_splits.find(
            {"order_id": order_id},
            {"_id": 0}
        ).to_list(100)
        
        return {
            "success": True,
            "splits": splits
        }
    
    return router
