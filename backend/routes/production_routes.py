"""Production Management Routes"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.production_batch import ProductionBatch, ProductionBatchCreate, ProductionBatchUpdate, ProductionStatus
from services.audit_service import create_audit_log

def create_production_router():
    router = APIRouter(tags=["production"])

    @router.get("/inventory/production-batches", response_model=List[ProductionBatch])
    async def list_production_batches(
        venue_id: str,
        status: Optional[ProductionStatus] = None,
        recipe_id: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        if recipe_id:
            query["recipe_id"] = recipe_id
            
        skip = (page - 1) * limit
        batches = await db.production_batches.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        return batches

    @router.post("/inventory/production-batches", response_model=ProductionBatch)
    async def create_production_batch(
        data: ProductionBatchCreate,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, data.venue_id)
        
        # Verify recipe exists
        recipe = await db.recipes_engineered.find_one({"id": data.recipe_id, "venue_id": data.venue_id})
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
            
        batch_dict = data.model_dump()
        batch_dict["id"] = str(uuid.uuid4())
        batch_dict["created_at"] = datetime.now(timezone.utc)
        batch_dict["updated_at"] = datetime.now(timezone.utc)
        batch_dict["produced_by"] = current_user["id"]
        
        await db.production_batches.insert_one(batch_dict)
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "production_batch", batch_dict["id"],
            {"batch_number": data.batch_number, "recipe": recipe.get("recipe_name")}
        )
        
        return batch_dict

    @router.patch("/inventory/production-batches/{batch_id}", response_model=ProductionBatch)
    async def update_production_batch(
        batch_id: str,
        data: ProductionBatchUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        batch = await db.production_batches.find_one({"id": batch_id})
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
            
        await check_venue_access(current_user, batch["venue_id"])
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.production_batches.update_one(
            {"id": batch_id},
            {"$set": update_data}
        )
        
        updated_batch = await db.production_batches.find_one({"id": batch_id})
        
        # Logic: If completed, increase stock of the recipe item?
        # For now, just tracking. Real implementation would deduct ingredients and add recipe stock.
        
        return updated_batch

    return router
