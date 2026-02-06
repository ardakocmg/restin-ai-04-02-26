"""Recipe Engineering Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.recipe_engineering import RecipeEngineered, RecipeVersion, RecipeCostAnalysis, RecipeEngineeredRequest


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
                "active_count": [{"$match": {"active": True}}, {"$count": "count"}],
                "archived_count": [{"$match": {"active": False}}, {"$count": "count"}],
                "total_count": [{"$count": "count"}],
                "missing_ids": [
                    {"$match": {"active": True, "item_id": {"$exists": False}}},
                    {"$count": "count"}
                ],
                "categories": [
                    {"$match": {"active": True}},
                    {"$group": {"_id": "$category"}},
                    {"$count": "count"}
                ],
                # Added today - simplified fallback
                "today_count": [
                    {"$match": {"active": True}},
                    {"$addFields": {
                        "check_date": {"$ifNull": ["$created_at", "$import_date"]}
                    }},
                    {"$match": {
                        "check_date": {"$gte": datetime.combine(datetime.now().date(), datetime.min.time())}
                    }},
                    {"$count": "count"}
                ]
            }}
        ]
        
        result = await db.RecipesEngineered.aggregate(pipeline).to_list(1)
        stats = result[0] if result else {}
        
        def get_count(key):
            return stats.get(key, [{}])[0].get("count", 0) if stats.get(key) else 0

        return {
            "total_active": get_count("active_count"),
            "total_archived": get_count("archived_count"),
            "total_recipes": get_count("total_count"),
            "missing_ids": get_count("missing_ids"),
            "categories": get_count("categories"), 
            "added_today": get_count("today_count")
        }

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-archive")
    async def bulk_archive_recipes(
        venue_id: str,
        recipe_ids: list[str],
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}},
            {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": f"Archived {result.modified_count} recipes"}

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-restore")
    async def bulk_restore_recipes(
        venue_id: str,
        recipe_ids: list[str],
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        result = await db.RecipesEngineered.update_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}},
            {"$set": {"active": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": f"Restored {result.modified_count} recipes"}

    @router.post("/venues/{venue_id}/recipes/engineered/bulk-delete")
    async def bulk_delete_recipes(
        venue_id: str,
        recipe_ids: list[str],
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Hard delete
        result = await db.RecipesEngineered.delete_many(
            {"venue_id": venue_id, "id": {"$in": recipe_ids}}
        )
        return {"message": f"Deleted {result.deleted_count} recipes"}
    
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
    
    return router
