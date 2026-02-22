import logging
logger = logging.getLogger(__name__)

"""Recipe Engineering Routes"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import io
import csv
import json as json_lib

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.recipe_engineering import RecipeEngineered, RecipeVersion, RecipeCostAnalysis, RecipeEngineeredRequest, RecipeChangeRecord


class BulkRecipeRequest(BaseModel):
    recipe_ids: List[str]


def create_recipe_engineering_router():
    router = APIRouter(tags=["recipe_engineering"])
    
    # ── Auto-costing helper ──
    async def _calculate_recipe_cost(venue_id: str, ingredients: list, servings: float, sell_price: float = 0, labor_cost: float = None, overhead_cost: float = None, markup_percentage: float = None):
        """Look up ingredient costs from inventory and sub-recipe costs, compute totals."""
        total_cost = 0.0
        costed_ingredients = []

        for ing in ingredients:
            ing_type = ing.get("type", "ingredient")
            ing_name = ing.get("name", ing.get("item_name", ""))
            net_qty = ing.get("net_qty", ing.get("quantity", 0))
            waste_pct = ing.get("waste_pct", 0)
            unit_cost = 0.0

            if ing_type == "sub_recipe":
                # Look up sub-recipe cost
                sub = await db.recipes.find_one(
                    {"venue_id": venue_id, "recipe_name": {"$regex": f"^{ing_name}$", "$options": "i"}, "active": True, "deleted_at": None},
                    {"cost_analysis": 1, "id": 1, "_id": 0}
                )
                if sub and sub.get("cost_analysis"):
                    unit_cost = sub["cost_analysis"].get("cost_per_serving", 0)
            else:
                # Look up ingredient cost from inventory
                item = await db.inventory_items.find_one(
                    {"venue_id": venue_id, "$or": [
                        {"name": {"$regex": f"^{ing_name}$", "$options": "i"}},
                        {"item_name": {"$regex": f"^{ing_name}$", "$options": "i"}}
                    ]},
                    {"cost": 1, "_id": 0}
                )
                if item:
                    unit_cost = item.get("cost", 0) or 0

            # Adjust for waste
            effective_qty = net_qty * (1 + waste_pct / 100) if waste_pct > 0 else net_qty
            line_cost = effective_qty * unit_cost

            costed_ingredients.append({
                **ing,
                "unit_cost": unit_cost,
                "total_cost": round(line_cost, 4),
                "effective_qty": round(effective_qty, 4),
            })
            total_cost += line_cost

        cost_per_serving = total_cost / servings if servings > 0 else 0
        food_cost_pct = (total_cost / sell_price * 100) if sell_price > 0 else None
        suggested = cost_per_serving * (1 + (markup_percentage or 0) / 100) if markup_percentage else None

        return RecipeCostAnalysis(
            total_cost=round(total_cost, 2),
            cost_per_serving=round(cost_per_serving, 4),
            ingredient_costs=costed_ingredients,
            labor_cost=labor_cost,
            overhead_cost=overhead_cost,
            markup_percentage=markup_percentage,
            suggested_price=round(suggested, 2) if suggested else None,
            food_cost_pct=round(food_cost_pct, 2) if food_cost_pct else None,
        )

    @router.post("/venues/{venue_id}/recipes/engineered")
    async def create_engineered_recipe(
        venue_id: str,
        recipe_data: RecipeEngineeredRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        # Auto-cost from inventory prices
        cost_analysis = await _calculate_recipe_cost(
            venue_id=venue_id,
            ingredients=recipe_data.ingredients,
            servings=recipe_data.servings,
            sell_price=recipe_data.sell_price,
            labor_cost=recipe_data.labor_cost,
            overhead_cost=recipe_data.overhead_cost,
            markup_percentage=recipe_data.markup_percentage,
        )

        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name", current_user.get("username", "Unknown"))

        # Build change history record
        initial_change = RecipeChangeRecord(
            version=1,
            change_type="created",
            change_method="manual_edit",
            change_summary="Recipe created",
            user_id=current_user["id"],
            user_name=user_name,
            timestamp=now,
        )

        recipe = RecipeEngineered(
            venue_id=venue_id,
            recipe_name=recipe_data.recipe_name,
            description=recipe_data.description,
            ingredients=recipe_data.ingredients,
            servings=recipe_data.servings,
            # Classification
            category=recipe_data.category,
            subcategory=recipe_data.subcategory,
            cuisine=recipe_data.cuisine,
            recipe_type=recipe_data.recipe_type,
            stage=recipe_data.stage,
            seasons=recipe_data.seasons,
            product_class=recipe_data.product_class,
            product_type=recipe_data.product_type,
            # Production
            prep_time_minutes=recipe_data.prep_time_minutes,
            prep_time_min=recipe_data.prep_time_min,
            cook_time_minutes=recipe_data.cook_time_minutes,
            cook_time_min=recipe_data.cook_time_min,
            plate_time_min=recipe_data.plate_time_min,
            # Portioning
            portion_weight_g=recipe_data.portion_weight_g,
            portion_volume_ml=recipe_data.portion_volume_ml,
            yield_pct=recipe_data.yield_pct,
            manual_weight=recipe_data.manual_weight,
            difficulty=recipe_data.difficulty,
            # Allergens & Dietary
            allergens=recipe_data.allergens,
            dietary=recipe_data.dietary,
            # Financial
            sell_price=recipe_data.sell_price,
            tax_pct=recipe_data.tax_pct,
            target_margin=recipe_data.target_margin,
            # Content
            composition=recipe_data.composition,
            steps=recipe_data.steps,
            remarks=recipe_data.remarks,
            reference_nr=recipe_data.reference_nr,
            url=recipe_data.url,
            kitchen_utensils=recipe_data.kitchen_utensils,
            storage_conditions=recipe_data.storage_conditions,
            shelf_life_days=recipe_data.shelf_life_days,
            is_perishable=recipe_data.is_perishable,
            instructions=recipe_data.instructions,
            # Outlets & Images
            outlets=recipe_data.outlets,
            images=recipe_data.images,
            # Cost & Meta
            cost_analysis=cost_analysis.model_dump(),
            nutrition=recipe_data.nutrition,
            tags=recipe_data.tags,
            raw_import_data=recipe_data.raw_import_data,
            active=recipe_data.active,
            # Audit
            created_by=current_user["id"],
            created_by_name=user_name,
            last_modified_by=current_user["id"],
            last_modified_by_name=user_name,
            last_modified_method="manual_edit",
            change_history=[initial_change.model_dump()],
        )

        await db.recipes.insert_one(recipe.model_dump())
        return recipe.model_dump()
    
    @router.get("/venues/{venue_id}/recipes/engineered")
    async def list_engineered_recipes(
        venue_id: str,
        category: Optional[str] = None,
        active: Optional[bool] = None,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        search: Optional[str] = None,
        quick_filter: Optional[str] = None,
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
        
        # Quick filter support for dashboard widgets
        if quick_filter == "today":
            from datetime import date
            today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
            query["$or"] = query.get("$or", []) + [
                {"created_at": {"$gte": today_start}},
                {"imported_at": {"$gte": today_start}}
            ] if query.get("$or") else None
            if not query.get("$or"):
                query["$or"] = [
                    {"created_at": {"$gte": today_start}},
                    {"imported_at": {"$gte": today_start}}
                ]
        elif quick_filter == "missing_id":
            query["$and"] = query.get("$and", []) + [
                {"$or": [{"item_id": {"$exists": False}}, {"item_id": ""}, {"item_id": None}]}
            ]
            
        if limit is None and page is None:
            # Legacy mode: Return list up to 200 (prevents timeout on free tiers)
            recipes = await db.recipes.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
            return recipes
            
        # Pagination Mode
        page = page or 1
        limit = limit or 50
        skip = (page - 1) * limit
        
        total_count = await db.recipes.count_documents(query)
        recipes = await db.recipes.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
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
        
        # Use separate count queries instead of $facet to avoid BSON size limit
        # with many large documents (raw_import_data can be huge)
        import asyncio
        
        async def count_active():
            return await db.recipes.count_documents({
                "venue_id": venue_id, "active": True, "deleted_at": None
            })
        
        async def count_archived():
            return await db.recipes.count_documents({
                "venue_id": venue_id, "active": False, "deleted_at": None
            })
        
        async def count_trash():
            return await db.recipes.count_documents({
                "venue_id": venue_id, "deleted_at": {"$ne": None}
            })
        
        async def count_total():
            return await db.recipes.count_documents({"venue_id": venue_id})
        
        async def count_missing_ids():
            return await db.recipes.count_documents({
                "venue_id": venue_id, "active": True, "deleted_at": None,
                "$or": [{"item_id": {"$exists": False}}, {"item_id": ""}, {"item_id": None}]
            })
        
        async def count_categories():
            pipeline = [
                {"$match": {"venue_id": venue_id, "active": True, "deleted_at": None}},
                {"$group": {"_id": "$category"}},
                {"$count": "count"}
            ]
            result = await db.recipes.aggregate(pipeline).to_list(1)
            return result[0]["count"] if result else 0
        
        async def count_added_today():
            from datetime import date
            today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
            return await db.recipes.count_documents({
                "venue_id": venue_id, 
                "deleted_at": None,
                "$or": [
                    {"created_at": {"$gte": today_start}},
                    {"imported_at": {"$gte": today_start}}
                ]
            })
        
        # Run all counts in parallel for speed
        results = await asyncio.gather(
            count_active(),
            count_archived(),
            count_trash(),
            count_total(),
            count_missing_ids(),
            count_categories(),
            count_added_today()
        )
        
        return {
            "total_active": results[0],
            "total_archived": results[1],
            "total_trash": results[2],
            "total_recipes": results[3],
            "missing_ids": results[4],
            "categories": results[5],
            "added_today": results[6]
        }

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-archive")
    async def bulk_archive_recipes(
        venue_id: str,
        request: BulkRecipeRequest,
        current_user: dict = Depends(get_current_user)
    ):
        recipe_ids = request.recipe_ids
        await check_venue_access(current_user, venue_id)
        
        result = await db.recipes.update_many(
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
        
        result = await db.recipes.update_many(
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
        result = await db.recipes.update_many(
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
        total = await db.recipes.count_documents(query)
        recipes = await db.recipes.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
        # Get venue trash retention settings (default 30 days)
        venue = await db.venues.find_one({"id": venue_id}, {"trash_retention_days": 1})
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
        
        result = await db.recipes.update_many(
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
        result = await db.recipes.delete_many({
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
        
        recipe = await db.recipes.find_one(
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

        existing = await db.recipes.find_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"_id": 0}
        )

        if not existing:
            raise HTTPException(404, "Recipe not found")

        now = datetime.now(timezone.utc).isoformat()
        user_name = current_user.get("name", current_user.get("username", "Unknown"))
        new_version = existing.get("version", 1) + 1
        old_cost = (existing.get("cost_analysis") or {}).get("total_cost", 0)

        # Recalculate cost from inventory prices
        ingredients = recipe_data.get("ingredients", existing.get("ingredients", []))
        servings = recipe_data.get("servings", existing.get("servings", 1))
        sell_price = recipe_data.get("sell_price", existing.get("sell_price", 0))

        cost_analysis = await _calculate_recipe_cost(
            venue_id=venue_id,
            ingredients=ingredients,
            servings=servings,
            sell_price=sell_price,
            labor_cost=recipe_data.get("labor_cost"),
            overhead_cost=recipe_data.get("overhead_cost"),
            markup_percentage=recipe_data.get("markup_percentage"),
        )
        cost_change = cost_analysis.total_cost - old_cost

        # Save version history (legacy collection)
        version_record = RecipeVersion(
            recipe_id=recipe_id,
            version=new_version,
            changes=recipe_data.get("change_notes", "Updated recipe"),
            cost_change=cost_change,
            user_id=current_user["id"],
            user_name=user_name,
        )
        await db.recipe_versions.insert_one(version_record.model_dump())

        # Build change_history entry
        change_entry = {
            "id": str(uuid.uuid4()),
            "version": new_version,
            "change_type": "updated",
            "change_method": "manual_edit",
            "change_summary": recipe_data.pop("change_notes", "Updated recipe"),
            "user_id": current_user["id"],
            "user_name": user_name,
            "timestamp": now,
        }

        # Strip fields we should never $set directly
        recipe_data.pop("id", None)
        recipe_data.pop("venue_id", None)
        recipe_data.pop("created_by", None)
        recipe_data.pop("created_at", None)
        recipe_data.pop("change_history", None)
        recipe_data.pop("_id", None)

        # Merge updates
        recipe_data["version"] = new_version
        recipe_data["updated_at"] = now
        recipe_data["cost_analysis"] = cost_analysis.model_dump()
        recipe_data["last_modified_by"] = current_user["id"]
        recipe_data["last_modified_by_name"] = user_name
        recipe_data["last_modified_method"] = "manual_edit"

        await db.recipes.update_one(
            {"id": recipe_id, "venue_id": venue_id},
            {
                "$set": recipe_data,
                "$push": {"change_history": change_entry},
            }
        )

        updated = await db.recipes.find_one(
            {"id": recipe_id, "venue_id": venue_id}, {"_id": 0}
        )

        return {"message": "Recipe updated", "new_version": new_version, "recipe": updated}
    
    @router.get("/venues/{venue_id}/recipes/engineered/{recipe_id}/versions")
    async def get_recipe_versions(
        venue_id: str,
        recipe_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        versions = await db.recipe_versions.find(
            {"recipe_id": recipe_id},
            {"_id": 0}
        ).sort("version", -1).to_list(100)
        
        return versions
    
    @router.get("/venues/{venue_id}/recipes/engineered/analytics/profitability")
    async def recipe_profitability_analysis(
        venue_id: str,
        days: int = Query(30, description="Number of days to analyze"),
        current_user: dict = Depends(get_current_user)
    ):
        """Full BCG matrix profitability analysis for Menu Engineering page."""
        await check_venue_access(current_user, venue_id)
        
        # 1. Get all active recipes with cost data
        recipes = await db.recipes.find(
            {"venue_id": venue_id, "active": True, "deleted_at": None},
            {"_id": 0, "id": 1, "recipe_name": 1, "category": 1, "cost_analysis": 1,
             "sell_price": 1, "servings": 1}
        ).to_list(500)
        
        if not recipes:
            return {"recipes": []}
        
        # 2. Aggregate sales data from orders in the date range
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        # Try to get sales from completed orders
        sales_pipeline = [
            {"$match": {
                "venue_id": venue_id,
                "status": {"$in": ["completed", "paid", "closed"]},
                "created_at": {"$gte": cutoff}
            }},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.menu_item_name",
                "times_sold": {"$sum": "$items.quantity"},
                "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
            }}
        ]
        
        try:
            sales_data = await db.orders.aggregate(sales_pipeline).to_list(1000)
        except Exception as e:  # noqa
            sales_data = []
        
        # Build lookup map: recipe_name -> {times_sold, revenue}
        sales_map = {}
        for s in sales_data:
            if s.get("_id"):
                sales_map[s["_id"].lower()] = {
                    "times_sold": s.get("times_sold", 0),
                    "revenue": round(s.get("revenue", 0), 2)
                }
        
        # 3. Build result items for BCG matrix
        result = []
        for recipe in recipes:
            cost_data = recipe.get("cost_analysis") or {}
            recipe_name = recipe.get("recipe_name", "Unknown")
            sell_price = float(recipe.get("sell_price", 0) or 0)
            cost_per_serving = float(cost_data.get("cost_per_serving", 0) or 0)
            
            # Look up sales data
            sales = sales_map.get(recipe_name.lower(), {})
            times_sold = sales.get("times_sold", 0)
            revenue = sales.get("revenue", 0)
            
            # If no order data, estimate from recipe cost data
            if times_sold == 0 and sell_price > 0:
                # Use food_cost_pct from cost analysis if available
                food_cost = 0
            else:
                food_cost = round(cost_per_serving * times_sold, 2)
            
            # Calculate margin
            margin_pct = 0
            if sell_price > 0:
                margin_pct = round(((sell_price - cost_per_serving) / sell_price) * 100, 1)
            
            food_cost_pct = 0
            if sell_price > 0:
                food_cost_pct = round((cost_per_serving / sell_price) * 100, 1)
            
            result.append({
                "id": recipe.get("id"),
                "name": recipe_name,
                "category": recipe.get("category", "Uncategorized"),
                "times_sold": times_sold,
                "revenue": revenue,
                "food_cost": food_cost,
                "sell_price": sell_price,
                "cost": cost_per_serving,
                "margin_pct": margin_pct,
                "profit": round(revenue - food_cost, 2),
                "food_cost_pct": food_cost_pct,
            })
        
        return {"recipes": result}
    
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
        
        total = await db.recipes.count_documents(query)
        recipes = await db.recipes.find(
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
        
        result = await db.recipes.update_many(
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
        result = await db.recipes.delete_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}, "deleted_at": {"$ne": None}}
        )
        
        # Log this critical action
        await db.audit_logs.insert_one({
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
        archived = await db.recipes.find(
            {
                "venue_id": venue_id,
                "active": False,
                "deleted_at": None,
                "recipe_name": {"$in": recipe_names}
            },
            {"recipe_name": 1, "id": 1, "_id": 0}
        ).to_list(len(recipe_names))
        
        # Find trashed recipes
        trashed = await db.recipes.find(
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
    
    # ============== COST TREE & RECALCULATION ==============

    @router.get("/venues/{venue_id}/recipes/engineered/{recipe_id}/cost-tree")
    async def get_cost_tree(
        venue_id: str,
        recipe_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get full cost breakdown with sub-recipe trees expanded."""
        await check_venue_access(current_user, venue_id)

        recipe = await db.recipes.find_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"_id": 0}
        )
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        # Recalculate with current prices
        cost_analysis = await _calculate_recipe_cost(
            venue_id=venue_id,
            ingredients=recipe.get("ingredients", []),
            servings=recipe.get("servings", 1),
            sell_price=recipe.get("sell_price", 0),
        )

        # Collect inherited allergens from all ingredient items
        inherited_allergens = set()
        for ing in recipe.get("ingredients", []):
            ing_name = ing.get("name", ing.get("item_name", ""))
            if ing.get("type") == "sub_recipe":
                sub = await db.recipes.find_one(
                    {"venue_id": venue_id, "recipe_name": {"$regex": f"^{ing_name}$", "$options": "i"}},
                    {"allergens": 1, "_id": 0}
                )
                if sub and sub.get("allergens"):
                    for a, v in sub["allergens"].items():
                        if v:
                            inherited_allergens.add(a)
            else:
                item = await db.inventory_items.find_one(
                    {"venue_id": venue_id, "$or": [
                        {"name": {"$regex": f"^{ing_name}$", "$options": "i"}},
                        {"item_name": {"$regex": f"^{ing_name}$", "$options": "i"}}
                    ]},
                    {"allergens": 1, "_id": 0}
                )
                if item and item.get("allergens"):
                    inherited_allergens.update(item["allergens"])

        return {
            "recipe_id": recipe_id,
            "recipe_name": recipe.get("recipe_name"),
            "cost_analysis": cost_analysis.model_dump(),
            "inherited_allergens": sorted(inherited_allergens),
            "sell_price": recipe.get("sell_price", 0),
            "target_margin": recipe.get("target_margin", 0),
        }

    @router.post("/venues/{venue_id}/recipes/engineered/{recipe_id}/recalculate-cost")
    async def recalculate_recipe_cost(
        venue_id: str,
        recipe_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Recalculate recipe cost from current inventory prices."""
        await check_venue_access(current_user, venue_id)

        recipe = await db.recipes.find_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"_id": 0}
        )
        if not recipe:
            raise HTTPException(404, "Recipe not found")

        cost_analysis = await _calculate_recipe_cost(
            venue_id=venue_id,
            ingredients=recipe.get("ingredients", []),
            servings=recipe.get("servings", 1),
            sell_price=recipe.get("sell_price", 0),
        )

        now = datetime.now(timezone.utc).isoformat()
        await db.recipes.update_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"$set": {
                "cost_analysis": cost_analysis.model_dump(),
                "updated_at": now,
            }}
        )

        return {
            "message": "Cost recalculated",
            "cost_analysis": cost_analysis.model_dump(),
        }

    # ============== RECIPE EXPORT & IMPORT TEMPLATE ==============

    RECIPE_EXPORT_COLUMNS = [
        "item_id", "recipe_name", "description", "category", "subcategory",
        "cuisine", "recipe_type", "product_class", "product_type", "stage",
        "servings", "sell_price", "tax_pct", "target_margin",
        "prep_time_min", "cook_time_min", "plate_time_min",
        "portion_weight_g", "portion_volume_ml", "yield_pct", "difficulty",
        "shelf_life_days", "is_perishable",
        "composition", "steps", "remarks", "reference_nr",
        "storage_conditions", "kitchen_utensils",
        "cost_per_serving", "total_cost", "food_cost_pct",
        "seasons", "tags", "active",
    ]

    @router.get("/venues/{venue_id}/recipes/engineered/export")
    async def export_recipes(
        venue_id: str,
        format: str = Query("csv", description="Export format: csv or json"),
        include_archived: bool = Query(False),
        current_user: dict = Depends(get_current_user)
    ):
        """Export all recipes as CSV or JSON."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if not include_archived:
            query["deleted_at"] = None

        recipes = await db.recipes.find(
            query, {"_id": 0}
        ).sort("recipe_name", 1).to_list(5000)

        if format == "json":
            return JSONResponse(
                content={"recipes": recipes, "count": len(recipes)},
                headers={"Content-Disposition": f"attachment; filename=recipes_export_{venue_id}.json"}
            )

        # CSV export
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=RECIPE_EXPORT_COLUMNS, extrasaction="ignore")
        writer.writeheader()

        for r in recipes:
            cost = r.get("cost_analysis") or {}
            row = {
                **r,
                "cost_per_serving": cost.get("cost_per_serving", ""),
                "total_cost": cost.get("total_cost", ""),
                "food_cost_pct": cost.get("food_cost_pct", ""),
                "prep_time_min": r.get("prep_time_min") or r.get("prep_time_minutes", ""),
                "cook_time_min": r.get("cook_time_min") or r.get("cook_time_minutes", ""),
                "seasons": ";".join(r.get("seasons", [])),
                "tags": ";".join(r.get("tags", [])),
            }
            writer.writerow(row)

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=recipes_export_{venue_id}.csv"}
        )

    @router.get("/venues/{venue_id}/recipes/engineered/import-template")
    async def get_import_template(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Download CSV import template with correct column headers."""
        await check_venue_access(current_user, venue_id)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=RECIPE_EXPORT_COLUMNS, extrasaction="ignore")
        writer.writeheader()

        # Write one example row
        example = {
            "item_id": "REC001",
            "recipe_name": "Example Pasta",
            "description": "Creamy tomato pasta",
            "category": "Main Course",
            "subcategory": "Pasta",
            "cuisine": "Italian",
            "recipe_type": "Main course",
            "product_class": "Finished Product",
            "product_type": "Food",
            "stage": "Complete",
            "servings": "4",
            "sell_price": "18.50",
            "tax_pct": "18",
            "target_margin": "70",
            "prep_time_min": "15",
            "cook_time_min": "25",
            "plate_time_min": "3",
            "portion_weight_g": "350",
            "portion_volume_ml": "",
            "yield_pct": "95",
            "difficulty": "2",
            "shelf_life_days": "1",
            "is_perishable": "true",
            "composition": "Cook pasta al dente, add sauce",
            "steps": "1. Boil water 2. Cook pasta 3. Add sauce",
            "remarks": "Garnish with basil",
            "reference_nr": "REF-001",
            "storage_conditions": "Refrigerate below 5C",
            "kitchen_utensils": "Large pot, Saucepan",
            "cost_per_serving": "",
            "total_cost": "",
            "food_cost_pct": "",
            "seasons": "Summer;Autumn",
            "tags": "pasta;italian;quick",
            "active": "true",
        }
        writer.writerow(example)

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=recipe_import_template.csv"}
        )

    @router.post("/venues/{venue_id}/recipes/engineered/import")
    async def import_recipes_csv(
        venue_id: str,
        request: Request,
        current_user: dict = Depends(get_current_user)
    ):
        """Import recipes from CSV/JSON payload (parsed client-side)."""
        await check_venue_access(current_user, venue_id)

        body = await request.json()
        rows = body.get("recipes", [])
        if not rows:
            raise HTTPException(400, "No recipes provided")

        user_name = current_user.get("name", current_user.get("username", "Unknown"))
        now = datetime.now(timezone.utc).isoformat()
        created = 0
        errors = []

        for idx, row in enumerate(rows):
            try:
                name = row.get("recipe_name", "").strip()
                if not name:
                    errors.append({"row": idx + 1, "error": "Missing recipe_name"})
                    continue

                # Parse semicolon-separated lists
                seasons = [s.strip() for s in str(row.get("seasons", "")).split(";") if s.strip()] if row.get("seasons") else []
                tags = [t.strip() for t in str(row.get("tags", "")).split(";") if t.strip()] if row.get("tags") else []

                # Build recipe data
                recipe_req = RecipeEngineeredRequest(
                    recipe_name=name,
                    description=row.get("description"),
                    category=row.get("category"),
                    subcategory=row.get("subcategory"),
                    cuisine=row.get("cuisine"),
                    recipe_type=row.get("recipe_type"),
                    product_class=row.get("product_class"),
                    product_type=row.get("product_type"),
                    stage=row.get("stage", "Draft"),
                    servings=float(row.get("servings", 1) or 1),
                    sell_price=float(row.get("sell_price", 0) or 0),
                    tax_pct=float(row.get("tax_pct", 18) or 18),
                    target_margin=float(row.get("target_margin", 70) or 70),
                    prep_time_min=int(row["prep_time_min"]) if row.get("prep_time_min") else None,
                    cook_time_min=int(row["cook_time_min"]) if row.get("cook_time_min") else None,
                    plate_time_min=int(row["plate_time_min"]) if row.get("plate_time_min") else None,
                    portion_weight_g=float(row["portion_weight_g"]) if row.get("portion_weight_g") else None,
                    portion_volume_ml=float(row["portion_volume_ml"]) if row.get("portion_volume_ml") else None,
                    yield_pct=float(row.get("yield_pct", 100) or 100),
                    difficulty=int(row.get("difficulty", 1) or 1),
                    shelf_life_days=int(row["shelf_life_days"]) if row.get("shelf_life_days") else None,
                    is_perishable=str(row.get("is_perishable", "false")).lower() == "true",
                    composition=row.get("composition"),
                    steps=row.get("steps"),
                    remarks=row.get("remarks"),
                    reference_nr=row.get("reference_nr"),
                    storage_conditions=row.get("storage_conditions"),
                    kitchen_utensils=row.get("kitchen_utensils"),
                    seasons=seasons,
                    tags=tags,
                    active=str(row.get("active", "true")).lower() != "false",
                )

                change_record = RecipeChangeRecord(
                    version=1,
                    change_type="imported",
                    change_method="excel_upload",
                    change_summary=f"Imported from CSV row {idx + 1}",
                    user_id=current_user["id"],
                    user_name=user_name,
                    timestamp=now,
                )

                recipe = RecipeEngineered(
                    venue_id=venue_id,
                    item_id=row.get("item_id"),
                    recipe_name=recipe_req.recipe_name,
                    description=recipe_req.description,
                    category=recipe_req.category,
                    subcategory=recipe_req.subcategory,
                    cuisine=recipe_req.cuisine,
                    recipe_type=recipe_req.recipe_type,
                    product_class=recipe_req.product_class,
                    product_type=recipe_req.product_type,
                    stage=recipe_req.stage,
                    servings=recipe_req.servings,
                    sell_price=recipe_req.sell_price,
                    tax_pct=recipe_req.tax_pct,
                    target_margin=recipe_req.target_margin,
                    prep_time_min=recipe_req.prep_time_min,
                    cook_time_min=recipe_req.cook_time_min,
                    plate_time_min=recipe_req.plate_time_min,
                    portion_weight_g=recipe_req.portion_weight_g,
                    portion_volume_ml=recipe_req.portion_volume_ml,
                    yield_pct=recipe_req.yield_pct,
                    difficulty=recipe_req.difficulty,
                    shelf_life_days=recipe_req.shelf_life_days,
                    is_perishable=recipe_req.is_perishable,
                    composition=recipe_req.composition,
                    steps=recipe_req.steps,
                    remarks=recipe_req.remarks,
                    reference_nr=recipe_req.reference_nr,
                    storage_conditions=recipe_req.storage_conditions,
                    kitchen_utensils=recipe_req.kitchen_utensils,
                    seasons=recipe_req.seasons,
                    tags=recipe_req.tags,
                    active=recipe_req.active,
                    created_by=current_user["id"],
                    created_by_name=user_name,
                    last_modified_by=current_user["id"],
                    last_modified_by_name=user_name,
                    last_modified_method="excel_upload",
                    change_history=[change_record.model_dump()],
                )

                await db.recipes.insert_one(recipe.model_dump())
                created += 1
            except Exception as e:
                errors.append({"row": idx + 1, "error": str(e)})

        return {
            "message": f"Imported {created} recipes",
            "created": created,
            "errors": errors,
            "total_rows": len(rows),
        }

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-recalculate")
    async def bulk_recalculate_costs(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Recalculate costs for ALL active recipes from current inventory prices."""
        await check_venue_access(current_user, venue_id)

        recipes = await db.recipes.find(
            {"venue_id": venue_id, "active": True, "deleted_at": None},
            {"id": 1, "ingredients": 1, "servings": 1, "sell_price": 1, "_id": 0}
        ).to_list(5000)

        now = datetime.now(timezone.utc).isoformat()
        updated = 0
        for r in recipes:
            cost_analysis = await _calculate_recipe_cost(
                venue_id=venue_id,
                ingredients=r.get("ingredients", []),
                servings=r.get("servings", 1),
                sell_price=r.get("sell_price", 0),
            )
            await db.recipes.update_one(
                {"id": r["id"], "venue_id": venue_id},
                {"$set": {"cost_analysis": cost_analysis.model_dump(), "updated_at": now}}
            )
            updated += 1

        return {"message": f"Recalculated costs for {updated} recipes", "updated": updated}

    return router
