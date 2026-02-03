"""Central Kitchen Production Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.central_kitchen import (
    InternalOrder, ProductionBatch, DistributionRecord,
    BatchStatus, DistributionStatus, ProductionBatchRequest
)


def create_central_kitchen_router():
    router = APIRouter(tags=["central_kitchen"])
    
    @router.post("/venues/{venue_id}/internal-orders")
    async def create_internal_order(
        venue_id: str,
        order_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        order = InternalOrder(
            order_number=f"IO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
            from_venue_id=venue_id,
            to_venue_id=order_data["central_kitchen_id"],
            items=order_data["items"],
            requested_delivery=order_data["requested_delivery"],
            created_by=current_user["id"]
        )
        
        await db.InternalOrders.insert_one(order.model_dump())
        return order.model_dump()
    
    @router.get("/venues/{venue_id}/internal-orders")
    async def list_internal_orders(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {
            "$or": [
                {"from_venue_id": venue_id},
                {"to_venue_id": venue_id}
            ]
        }
        if status:
            query["status"] = status
        
        orders = await db.InternalOrders.find(query, {"_id": 0}).to_list(1000)
        return orders
    
    @router.post("/venues/{venue_id}/production/batches")
    async def create_production_batch(
        venue_id: str,
        batch_data: ProductionBatchRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        batch = ProductionBatch(
            venue_id=venue_id,
            batch_number=f"BATCH-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
            batch_date=batch_data.batch_date,
            items=batch_data.items,
            internal_orders=batch_data.internal_orders
        )
        
        await db.ProductionBatches.insert_one(batch.model_dump())
        return batch.model_dump()
    
    @router.get("/venues/{venue_id}/production/batches")
    async def list_production_batches(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        batches = await db.ProductionBatches.find(query, {"_id": 0}).to_list(1000)
        return batches
    
    @router.post("/venues/{venue_id}/production/batches/{batch_id}/start")
    async def start_batch(
        venue_id: str,
        batch_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.ProductionBatches.update_one(
            {"id": batch_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "in_progress",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "produced_by": current_user["id"]
                }
            }
        )
        
        return {"message": "Batch started"}
    
    @router.post("/venues/{venue_id}/production/batches/{batch_id}/complete")
    async def complete_batch(
        venue_id: str,
        batch_id: str,
        completion_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.ProductionBatches.update_one(
            {"id": batch_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "quality_checked": completion_data.get("quality_checked", False),
                    "quality_notes": completion_data.get("quality_notes")
                }
            }
        )
        
        return {"message": "Batch completed"}
    
    @router.post("/venues/{venue_id}/distribution")
    async def create_distribution(
        venue_id: str,
        distribution_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        distribution = DistributionRecord(
            batch_id=distribution_data["batch_id"],
            from_venue_id=venue_id,
            to_venue_id=distribution_data["to_venue_id"],
            items=distribution_data["items"]
        )
        
        await db.DistributionRecords.insert_one(distribution.model_dump())
        return distribution.model_dump()
    
    @router.get("/venues/{venue_id}/distribution")
    async def list_distributions(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {
            "$or": [
                {"from_venue_id": venue_id},
                {"to_venue_id": venue_id}
            ]
        }
        if status:
            query["status"] = status
        
        distributions = await db.DistributionRecords.find(query, {"_id": 0}).to_list(1000)
        return distributions
    
    @router.post("/venues/{venue_id}/distribution/{distribution_id}/ship")
    async def ship_distribution(
        venue_id: str,
        distribution_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.DistributionRecords.update_one(
            {"id": distribution_id, "from_venue_id": venue_id},
            {
                "$set": {
                    "status": "in_transit",
                    "shipped_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Distribution shipped"}
    
    @router.post("/venues/{venue_id}/distribution/{distribution_id}/receive")
    async def receive_distribution(
        venue_id: str,
        distribution_id: str,
        receive_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.DistributionRecords.update_one(
            {"id": distribution_id, "to_venue_id": venue_id},
            {
                "$set": {
                    "status": "delivered",
                    "delivered_at": datetime.now(timezone.utc).isoformat(),
                    "received_by": current_user["id"],
                    "delivery_notes": receive_data.get("notes")
                }
            }
        )
        
        return {"message": "Distribution received"}
    
    return router
