"""Recipe Engineering Routes"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.recipe_engineering import RecipeEngineered, RecipeVersion, RecipeCostAnalysis, RecipeEngineeredRequest, RecipeChangeRecord


class BulkRecipeRequest(BaseModel):
    recipe_ids: List[str]


def create_recipe_engineering_router():
    router = APIRouter(tags=["recipe_engineering"])
    
    @router.post("/venues/{venue_id}/recipes/engineered")
    async def create_engineered_recipe(
        venue_id: str,
        recipe_data: RecipeEngineeredRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Calculate cost analysis
        total_cost = sum(ing.get("total_cost", 0) for ing in recipe_data.ingredients)
        servings = recipe_data.servings
        cost_per_serving = total_cost / servings if servings > 0 else 0
        
        cost_analysis = RecipeCostAnalysis(
            total_cost=total_cost,
            cost_per_serving=cost_per_serving,
            ingredient_costs=recipe_data.ingredients,
            labor_cost=recipe_data.labor_cost,
            overhead_cost=recipe_data.overhead_cost,
            markup_percentage=recipe_data.markup_percentage,
            suggested_price=cost_per_serving * (1 + (recipe_data.markup_percentage or 0) / 100)
        )
        
        recipe = RecipeEngineered(
            venue_id=venue_id,
            recipe_name=recipe_data.recipe_name,
            description=recipe_data.description,
            ingredients=recipe_data.ingredients,
            servings=servings,
            prep_time_minutes=recipe_data.prep_time_minutes,
            cook_time_minutes=recipe_data.cook_time_minutes,
            cost_analysis=cost_analysis.model_dump(),
            nutrition=recipe_data.nutrition,
            instructions=recipe_data.instructions,
            category=recipe_data.category,
            tags=recipe_data.tags,
            raw_import_data=recipe_data.raw_import_data,
            created_by=current_user["id"]
        )
        
        await db.RecipesEngineered.insert_one(recipe.model_dump())
        return recipe.model_dump()
    
    @router.get("/venues/{venue_id}/recipes/engineered")
    async def list_engineered_recipes(
        venue_id: str,
        category: Optional[str] = None,
        active: Optional[bool] = None,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        search: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if category:
            query["category"] = category
        
        # Strict state filtering
        if active is not None:
            query["active"] = active
            query["deleted_at"] = None  # Exclude trashed items from active/archived views
            
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"recipe_name": search_regex},
                {"item_id": search_regex},
                {"raw_import_data.Item ID": search_regex},
                {"raw_import_data.Sku": search_regex}
            ]
            
        if limit is None and page is None:
            # Legacy mode: Return list up to 50k
            recipes = await db.RecipesEngineered.find(query, {"_id": 0}).to_list(50000)
            return recipes
            
        # Pagination Mode
        page = page or 1
        limit = limit or 50
        skip = (page - 1) * limit
        
        total_count = await db.RecipesEngineered.count_documents(query)
        recipes = await db.RecipesEngineered.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
        return {
            "items": recipes,
            "total": total_count,
            "page": page,
            "pages": (total_count + limit - 1) // limit,
            "limit": limit
        }

    @router.get("/venues/{venue_id}/recipes/engineered/stats")
    async def get_recipe_stats(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Parallel stats fetching using aggregation for speed
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$facet": {
                "active_count": [{"$match": {"active": True, "deleted_at": None}}, {"$count": "count"}],
                "archived_count": [{"$match": {"active": False, "deleted_at": None}}, {"$count": "count"}],
                "trash_count": [{"$match": {"deleted_at": {"$ne": None}}}, {"$count": "count"}],
                "total_count": [{"$count": "count"}],
                "missing_ids": [
                    {"$match": {"active": True, "deleted_at": None, "item_id": {"$exists": False}}},
                    {"$count": "count"}
                ],
                "categories": [
                    {"$match": {"active": True, "deleted_at": None}},
                    {"$group": {"_id": "$category"}},
                    {"$count": "count"}
                ],
                # Added today - disabled due to inconsistent date formats
                # Will return 0 until data migration normalizes dates
                "today_count": []
            }}
        ]
        
        result = await db.RecipesEngineered.aggregate(pipeline).to_list(1)
        stats = result[0] if result else {}
        
        def get_count(key):
            return stats.get(key, [{}])[0].get("count", 0) if stats.get(key) else 0

        return {
            "total_active": get_count("active_count"),
            "total_archived": get_count("archived_count"),
            "total_trash": get_count("trash_count"),
            "total_recipes": get_count("total_count"),
            "missing_ids": get_count("missing_ids"),
            "categories": get_count("categories"), 
            "added_today": get_count("today_count")
        }

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-archive")
    async def bulk_archive_recipes(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        recipe_ids = request.recipe_ids
        await check_venue_access(current_user, venue_id)
        
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}},
            {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": f"Archived {result.modified_count} recipes"}

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-restore")
    async def bulk_restore_recipes(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        recipe_ids = request.recipe_ids
        await check_venue_access(current_user, venue_id)
        
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}},
            {"$set": {"active": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": f"Restored {result.modified_count} recipes"}

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-delete")
    async def bulk_delete_recipes(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        recipe_ids = request.recipe_ids
        await check_venue_access(current_user, venue_id)
        
        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name", current_user.get("username", "Unknown"))
        
        # Soft delete - move to trash
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}, "deleted_at": None},
            {"$set": {
                "deleted_at": now,
                "deleted_by": current_user["id"],
                "updated_at": now,
                "last_modified_by": current_user["id"],
                "last_modified_by_name": user_name,
                "last_modified_method": "bulk_action"
            },
            "$push": {
                "change_history": {
                    "id": str(uuid.uuid4()),
                    "version": 0,  # No version change for delete
                    "change_type": "deleted",
                    "change_method": "bulk_action",
                    "change_summary": "Moved to trash",
                    "user_id": current_user["id"],
                    "user_name": user_name,
                    "timestamp": now
                }
            }}
        )
        return {"message": f"Moved {result.modified_count} recipes to trash"}
    
    # ===== TRASH MANAGEMENT ENDPOINTS =====
    # NOTE: These MUST come BEFORE /{recipe_id} route or "trash" gets caught as a recipe_id
    
    @router.get("/venues/{venue_id}/recipes/engineered/trash")
    async def list_trashed_recipes(
        venue_id: str,
        page: int = 1,
        limit: int = 50,
        search: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all recipes in the trash bin."""
        await check_venue_access(current_user, venue_id)
        
        # All authenticated users can view trash (role check removed)
        
        query = {
            "venue_id": venue_id,
            "deleted_at": {"$ne": None}
        }
        
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"recipe_name": search_regex},
                {"item_id": search_regex}
            ]
        
        skip = (page - 1) * limit
        total = await db.RecipesEngineered.count_documents(query)
        recipes = await db.RecipesEngineered.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
        # Get venue trash retention settings (default 30 days)
        venue = await db.Venues.find_one({"id": venue_id}, {"trash_retention_days": 1})
        retention_days = venue.get("trash_retention_days", 30) if venue else 30
        
        return {
            "data": recipes,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "retention_days": retention_days
        }
    
    @router.post("/venues/{venue_id}/recipes/engineered/bulk-restore-trash")
    async def bulk_restore_from_trash(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Restore recipes from trash back to active."""
        await check_venue_access(current_user, venue_id)
        
        recipe_ids = request.recipe_ids
        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name", current_user.get("username", "Unknown"))
        
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}, "deleted_at": {"$ne": None}},
            {
                "$set": {
                    "deleted_at": None,
                    "deleted_by": None,
                    "active": True,
                    "updated_at": now,
                    "last_modified_by": current_user["id"],
                    "last_modified_by_name": user_name,
                    "last_modified_method": "bulk_action"
                },
                "$inc": {"version": 1},
                "$push": {
                    "change_history": {
                        "id": str(uuid.uuid4()),
                        "version": 0,
                        "change_type": "restored_from_trash",
                        "change_method": "bulk_action",
                        "change_summary": "Restored from trash",
                        "user_id": current_user["id"],
                        "user_name": user_name,
                        "timestamp": now
                    }
                }
            }
        )
        return {"message": f"Restored {result.modified_count} recipes from trash"}
    
    @router.post("/venues/{venue_id}/recipes/engineered/bulk-purge")
    async def bulk_purge_recipes(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Permanently delete recipes from trash."""
        await check_venue_access(current_user, venue_id)
        
        recipe_ids = request.recipe_ids
        
        # Only delete if already in trash
        result = await db.RecipesEngineered.delete_many({
            "venue_id": venue_id,
            "id": {"$in": recipe_ids},
            "deleted_at": {"$ne": None}
        })
        
        return {"message": f"Permanently deleted {result.deleted_count} recipes"}
    
    @router.get("/venues/{venue_id}/recipes/engineered/{recipe_id}")
    async def get_engineered_recipe(
        venue_id: str,
        recipe_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        recipe = await db.RecipesEngineered.find_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not recipe:
            raise HTTPException(404, "Recipe not found")
        
        return recipe
    
    @router.put("/venues/{venue_id}/recipes/engineered/{recipe_id}")
    async def update_engineered_recipe(
        venue_id: str,
        recipe_id: str,
        recipe_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        existing = await db.RecipesEngineered.find_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"_id": 0}
        )
        
        if not existing:
            raise HTTPException(404, "Recipe not found")
        
        # Create new version
        new_version = existing.get("version", 1) + 1
        old_cost = existing.get("cost_analysis", {}).get("total_cost", 0)
        
        # Recalculate cost
        total_cost = sum(ing["total_cost"] for ing in recipe_data.get("ingredients", []))
        cost_change = total_cost - old_cost
        
        # Save version history
        version_record = RecipeVersion(
            recipe_id=recipe_id,
            version=new_version,
            changes=recipe_data.get("change_notes", "Updated recipe"),
            cost_change=cost_change,
            created_by=current_user["id"]
        )
        await db.RecipeVersions.insert_one(version_record.model_dump())
        
        # Update recipe
        recipe_data["version"] = new_version
        recipe_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.RecipesEngineered.update_one(
            {"id": recipe_id},
            {"$set": recipe_data}
        )
        
        return {"message": "Recipe updated", "new_version": new_version}
    
    @router.get("/venues/{venue_id}/recipes/engineered/{recipe_id}/versions")
    async def get_recipe_versions(
        venue_id: str,
        recipe_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        versions = await db.RecipeVersions.find(
            {"recipe_id": recipe_id},
            {"_id": 0}
        ).sort("version", -1).to_list(100)
        
        return versions
    
    @router.get("/venues/{venue_id}/recipes/engineered/analytics/profitability")
    async def recipe_profitability_analysis(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        recipes = await db.RecipesEngineered.find(
            {"venue_id": venue_id, "active": True},
            {"_id": 0}
        ).to_list(50000)
        
        analysis = []
        for recipe in recipes:
            cost_data = recipe.get("cost_analysis", {})
            analysis.append({
                "recipe_id": recipe["id"],
                "recipe_name": recipe["recipe_name"],
                "cost_per_serving": cost_data.get("cost_per_serving", 0),
                "suggested_price": cost_data.get("suggested_price", 0),
                "markup_percentage": cost_data.get("markup_percentage", 0)
            })
        
        return analysis
    
    # ============== TRASH MANAGEMENT (Owner/Product Owner Only) ==============
    
    @router.get("/venues/{venue_id}/recipes/engineered/trash")
    async def list_trash(
        venue_id: str,
        page: int = 1,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """List recipes in trash (soft-deleted). Owner/Product Owner only."""
        await check_venue_access(current_user, venue_id)
        
        # Permission check - only owner/product_owner
        if current_user.get("role") not in ["owner", "product_owner", "admin"]:
            raise HTTPException(403, "Only owners can view trash")
        
        skip = (page - 1) * limit
        query = {"venue_id": venue_id, "deleted_at": {"$ne": None}}
        
        total = await db.RecipesEngineered.count_documents(query)
        recipes = await db.RecipesEngineered.find(
            query, {"_id": 0}
        ).sort("deleted_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Calculate days until auto-purge (configurable per venue, default 30)
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        retention_days = venue.get("trash_retention_days", 30) if venue else 30
        
        for recipe in recipes:
            if recipe.get("deleted_at"):
                deleted_dt = datetime.fromisoformat(recipe["deleted_at"].replace("Z", "+00:00"))
                now_dt = datetime.now(timezone.utc)
                days_in_trash = (now_dt - deleted_dt).days
                recipe["days_until_purge"] = max(0, retention_days - days_in_trash)
        
        return {
            "items": recipes,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "retention_days": retention_days
        }
    
    @router.post("/venues/{venue_id}/recipes/engineered/bulk-restore-trash")
    async def bulk_restore_from_trash(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Restore recipes from trash back to active."""
        recipe_ids = request.recipe_ids
        await check_venue_access(current_user, venue_id)
        
        if current_user.get("role") not in ["owner", "product_owner", "admin"]:
            raise HTTPException(403, "Only owners can restore from trash")
        
        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name", current_user.get("username", "Unknown"))
        
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}, "deleted_at": {"$ne": None}},
            {"$set": {
                "deleted_at": None,
                "deleted_by": None,
                "active": True,
                "updated_at": now,
                "last_modified_by": current_user["id"],
                "last_modified_by_name": user_name,
                "last_modified_method": "bulk_action"
            },
            "$push": {
                "change_history": {
                    "id": str(uuid.uuid4()),
                    "version": 0,
                    "change_type": "restored_from_trash",
                    "change_method": "bulk_action",
                    "change_summary": "Restored from trash",
                    "user_id": current_user["id"],
                    "user_name": user_name,
                    "timestamp": now
                }
            }}
        )
        return {"message": f"Restored {result.modified_count} recipes from trash"}
    
    @router.post("/venues/{venue_id}/recipes/engineered/bulk-purge")
    async def bulk_purge_recipes(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """PERMANENT delete - Owner only. Cannot be undone!"""
        recipe_ids = request.recipe_ids
        await check_venue_access(current_user, venue_id)
        
        # Strict owner-only check
        if current_user.get("role") not in ["owner"]:
            raise HTTPException(403, "Only owners can permanently delete recipes")
        
        # Hard delete from trash only
        result = await db.RecipesEngineered.delete_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}, "deleted_at": {"$ne": None}}
        )
        
        # Log this critical action
        await db.AuditLogs.insert_one({
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "action": "PERMANENT_DELETE_RECIPES",
            "entity_type": "recipe_engineered",
            "entity_ids": recipe_ids,
            "user_id": current_user["id"],
            "user_name": current_user.get("name", "Unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": f"Permanently deleted {result.deleted_count} recipes"
        })
        
        return {"message": f"Permanently deleted {result.deleted_count} recipes"}
    
    # ============== ARCHIVE DETECTION FOR IMPORT ==============
    
    @router.post("/venues/{venue_id}/recipes/engineered/check-archive")
    async def check_archived_recipes(
        venue_id: str,
        recipe_names: List[str],
        current_user: dict = Depends(get_current_user)
    ):
        """Check if any recipes exist in archive/trash for import preview."""
        await check_venue_access(current_user, venue_id)
        
        # Find archived recipes (active=False but not deleted)
        archived = await db.RecipesEngineered.find(
            {
                "venue_id": venue_id,
                "active": False,
                "deleted_at": None,
                "recipe_name": {"$in": recipe_names}
            },
            {"recipe_name": 1, "id": 1, "_id": 0}
        ).to_list(len(recipe_names))
        
        # Find trashed recipes
        trashed = await db.RecipesEngineered.find(
            {
                "venue_id": venue_id,
                "deleted_at": {"$ne": None},
                "recipe_name": {"$in": recipe_names}
            },
            {"recipe_name": 1, "id": 1, "_id": 0}
        ).to_list(len(recipe_names))
        
        return {
            "archived_matches": archived,
            "trashed_matches": trashed,
            "message": f"Found {len(archived)} in archive, {len(trashed)} in trash"
        }
    
    return router
