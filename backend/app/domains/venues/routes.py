"""
Venues domain routes - ALL data from MongoDB exclusively.
No DataLoader, no JSON files.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId

from app.core.database import get_database

router = APIRouter(prefix="/api/venues", tags=["venues"])


@router.get("")
async def list_venues():
    """Get all venues from MongoDB."""
    db = get_database()
    venues = await db.venues.find({}).to_list(length=100)
    for v in venues:
        v["_id"] = str(v["_id"])
    return venues


@router.get("/{venue_id}")
async def get_venue(venue_id: str):
    """Get a single venue by ID from MongoDB."""
    db = get_database()
    venue = await db.venues.find_one({"id": venue_id})
    if not venue:
        raise HTTPException(404, f"Venue '{venue_id}' not found")
    venue["_id"] = str(venue["_id"])
    return venue


# ==================== ZONES & TABLES ====================

@router.get("/{venue_id}/zones")
async def get_zones(venue_id: str):
    """Get zones for a venue from MongoDB."""
    db = get_database()
    zones = await db.zones.find({"venue_id": venue_id}).to_list(length=100)
    for z in zones:
        z["_id"] = str(z["_id"])
    return zones


@router.get("/{venue_id}/tables")
async def get_tables(venue_id: str):
    """Get tables for a venue from MongoDB."""
    db = get_database()
    tables = await db.tables.find({"venue_id": venue_id}).to_list(length=500)
    for t in tables:
        t["_id"] = str(t["_id"])
    return tables


# ==================== MENUS ====================

@router.get("/{venue_id}/menus")
async def get_menus(venue_id: str):
    """Get menus for a venue from MongoDB."""
    db = get_database()
    menus = await db.menus.find({"venue_id": venue_id}).to_list(length=50)
    for m in menus:
        m["_id"] = str(m["_id"])
    return menus


@router.get("/{venue_id}/menu-categories")
async def get_menu_categories(venue_id: str):
    """Get menu categories for a venue from MongoDB."""
    db = get_database()
    categories = await db.menu_categories.find({"venue_id": venue_id}).to_list(length=200)
    for c in categories:
        c["_id"] = str(c["_id"])
    return categories


@router.get("/{venue_id}/menu-items")
async def get_menu_items(venue_id: str):
    """Get menu items for a venue from MongoDB."""
    db = get_database()
    items = await db.menu_items.find({"venue_id": venue_id}).to_list(length=1000)
    for i in items:
        i["_id"] = str(i["_id"])
    return items


# ==================== RECIPES (ENGINEERED) ====================

@router.get("/{venue_id}/recipes/engineered/stats")
async def get_recipe_stats(venue_id: str):
    """Get recipe statistics for a venue from MongoDB."""
    db = get_database()
    
    # Get all recipes from MongoDB
    all_recipes = await db.recipes_engineered.find({}).to_list(length=None)
    
    # Also include menu items as recipes if no recipes_engineered exist
    if not all_recipes:
        all_recipes = await db.menu_items.find({"venue_id": venue_id}).to_list(length=None)
    
    # Clean and process
    valid = [r for r in all_recipes if not r.get("deleted", False)]
    active = [r for r in valid if r.get("active", True)]
    archived = [r for r in valid if not r.get("active", True)]
    deleted = [r for r in all_recipes if r.get("deleted", False)]
    
    # Categories
    categories = set()
    missing_ids = 0
    for r in valid:
        cat = r.get("category", r.get("category_id", "Uncategorized"))
        categories.add(cat)
        if not r.get("item_id") and not r.get("id"):
            missing_ids += 1
    
    from datetime import datetime
    today_str = datetime.now().strftime("%Y-%m-%d")
    added_today = sum(1 for r in valid if str(r.get("created_at", "")).startswith(today_str))
    
    return {
        "total_active": len(active),
        "total_archived": len(archived),
        "total_recipes": len(valid),
        "total_trash": len(deleted),
        "added_today": added_today,
        "categories": len(categories),
        "missing_ids": missing_ids,
        "avg_margin_percent": 65.0,
        "total_price_cents": sum(float(r.get("priceCents", r.get("price_cents", 0)) or 0) for r in valid)
    }


@router.get("/{venue_id}/recipes/engineered")
async def get_recipes(
    venue_id: str,
    active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get recipes from MongoDB - optimized for large collections."""
    db = get_database()
    
    skip = (page - 1) * limit
    
    # Fast check: does recipes_engineered have ANY data?
    engineered_count = await db.recipes_engineered.estimated_document_count()
    
    if engineered_count > 0:
        # Use recipes_engineered - just fetch data directly, skip slow count
        query = {}
        if active is not None:
            query["active"] = active
        
        recipes = await db.recipes_engineered.find(query).skip(skip).limit(limit).to_list(length=limit)
        total = engineered_count  # Use estimate for total
    else:
        # Fallback: use menu_items as recipes
        query = {"venue_id": venue_id}
        if active is not None:
            query["is_active"] = active
        
        total = await db.menu_items.count_documents(query)
        recipes = await db.menu_items.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        # Normalize menu items to look like recipes
        for r in recipes:
            if "recipe_name" not in r:
                r["recipe_name"] = r.get("name", "Unknown")
            if "active" not in r:
                r["active"] = r.get("is_active", True)
            if "category" not in r:
                r["category"] = r.get("category_id", "Uncategorized")
    
    # Convert ObjectIds
    for r in recipes:
        r["_id"] = str(r["_id"])
        if "id" not in r:
            r["id"] = r["_id"]
    
    return {
        "items": recipes,
        "total": total,
        "page": page,
        "limit": limit
    }


@router.get("/{venue_id}/recipes/engineered/trash")
async def get_recipe_trash(
    venue_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get trashed recipes from MongoDB."""
    db = get_database()
    
    query = {"deleted": True}
    total = await db.recipes_engineered.count_documents(query)
    skip = (page - 1) * limit
    recipes = await db.recipes_engineered.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    for r in recipes:
        r["_id"] = str(r["_id"])
    
    return {"items": recipes, "total": total, "page": page, "limit": limit}


# ==================== BULK RECIPE ACTIONS ====================

class BulkActionRequest(BaseModel):
    recipe_ids: List[str]


async def _update_recipes(ids: List[str], updates: dict):
    """Update recipes by ID in MongoDB."""
    db = get_database()
    
    # Update by string id
    res1 = await db.recipes_engineered.update_many(
        {"id": {"$in": ids}}, {"$set": updates}
    )
    
    # Also try ObjectId
    obj_ids = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
    count = res1.modified_count
    if obj_ids:
        res2 = await db.recipes_engineered.update_many(
            {"_id": {"$in": obj_ids}}, {"$set": updates}
        )
        count += res2.modified_count
    return count


@router.post("/{venue_id}/recipes/engineered/bulk-archive")
async def bulk_archive(venue_id: str, request: BulkActionRequest):
    count = await _update_recipes(request.recipe_ids, {"active": False})
    return {"status": "success", "archived": count}


@router.post("/{venue_id}/recipes/engineered/bulk-delete")
async def bulk_delete(venue_id: str, request: BulkActionRequest):
    count = await _update_recipes(request.recipe_ids, {"deleted": True})
    return {"status": "success", "deleted": count}


@router.post("/{venue_id}/recipes/engineered/bulk-restore")
async def bulk_restore(venue_id: str, request: BulkActionRequest):
    count = await _update_recipes(request.recipe_ids, {"active": True})
    return {"status": "success", "restored": count}


@router.post("/{venue_id}/recipes/engineered/bulk-purge")
async def bulk_purge(venue_id: str, request: BulkActionRequest):
    db = get_database()
    res1 = await db.recipes_engineered.delete_many({"id": {"$in": request.recipe_ids}})
    obj_ids = [ObjectId(i) for i in request.recipe_ids if ObjectId.is_valid(i)]
    total = res1.deleted_count
    if obj_ids:
        res2 = await db.recipes_engineered.delete_many({"_id": {"$in": obj_ids}})
        total += res2.deleted_count
    return {"status": "success", "purged": total}


@router.post("/{venue_id}/recipes/engineered/bulk-restore-trash")
async def bulk_restore_trash(venue_id: str, request: BulkActionRequest):
    count = await _update_recipes(request.recipe_ids, {"deleted": False})
    return {"status": "success", "restored": count}


# ==================== VENUE METRICS ====================

@router.get("/{venue_id}/metrics")
async def get_venue_metrics(venue_id: str):
    """Get metrics for venue dashboard."""
    db = get_database()
    
    orders_today = await db.orders.count_documents({"venue_id": venue_id})
    tables = await db.tables.count_documents({"venue_id": venue_id})
    menu_items = await db.menu_items.count_documents({"venue_id": venue_id})
    employees = await db.employees.count_documents({"venue_id": venue_id})
    
    return {
        "orders_today": orders_today,
        "total_tables": tables,
        "total_menu_items": menu_items,
        "total_employees": employees,
        "revenue_today_cents": 0,
        "avg_order_cents": 0
    }


@router.get("/{venue_id}/devices")
async def get_venue_devices(venue_id: str):
    """Get registered devices for a venue."""
    db = get_database()
    devices = await db.device_bindings.find({"venue_id": venue_id}).to_list(length=100)
    for d in devices:
        d["_id"] = str(d["_id"])
    return devices
