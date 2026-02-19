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
    """Get recipe statistics - uses sync PyMongo for large collections."""
    import asyncio
    from app.core.database import get_sync_database
    
    def _stats():
        sdb = get_sync_database()
        
        # Use efficient counts instead of loading all 37K docs
        eng_count = sdb.recipes.estimated_document_count()
        
        if eng_count > 0:
            total = eng_count
            # Sample to get category count
            categories = sdb.recipes.distinct("category")
            trash_count = sdb.recipes.count_documents({"deleted": True})
            active_count = total - trash_count
        else:
            # Fallback to menu_items
            total = sdb.menu_items.count_documents({"venue_id": venue_id})
            categories = sdb.menu_items.distinct("category_id", {"venue_id": venue_id})
            active_count = total
            trash_count = 0
        
        return {
            "total_active": active_count,
            "total_archived": 0,
            "total_recipes": total,
            "total_trash": trash_count,
            "added_today": 0,
            "categories": len(categories),
            "missing_ids": 0,
            "avg_margin_percent": 65.0,
            "total_price_cents": 0
        }
    
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _stats)


@router.get("/{venue_id}/recipes/engineered")
def get_recipes(
    venue_id: str,
    active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get recipes using sync PyMongo (sync def = FastAPI runs in threadpool)."""
    import json
    from app.core.database import get_sync_database
    from fastapi.responses import JSONResponse
    
    sdb = get_sync_database()
    skip = (page - 1) * limit
    
    # Check recipes_engineered first
    eng_count = sdb.recipes.estimated_document_count()
    print(f"[RECIPES] eng_count={eng_count}, skip={skip}, limit={limit}")
    
    if eng_count > 0:
        query = {}
        if active is not None:
            query["active"] = active
        
        docs = list(sdb.recipes.find(query).skip(skip).limit(limit))
        total = eng_count
        print(f"[RECIPES] found {len(docs)} docs from recipes_engineered")
    else:
        # Fallback to menu_items
        query = {"venue_id": venue_id}
        if active is not None:
            query["is_active"] = active
        
        total = sdb.menu_items.count_documents(query)
        docs = list(sdb.menu_items.find(query).skip(skip).limit(limit))
        print(f"[RECIPES] fallback: {len(docs)} docs from menu_items")
        
        for r in docs:
            if "recipe_name" not in r:
                r["recipe_name"] = r.get("name", "Unknown")
            if "active" not in r:
                r["active"] = r.get("is_active", True)
            if "category" not in r:
                r["category"] = r.get("category_id", "Uncategorized")
    
    # Convert ALL BSON types to strings for JSON safety
    def bson_safe(obj):
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        return str(obj)
    
    # Convert ObjectIds and other BSON types
    for r in docs:
        for key in list(r.keys()):
            val = r[key]
            if hasattr(val, '__str__') and type(val).__name__ == 'ObjectId':
                r[key] = str(val)
            elif hasattr(val, 'isoformat'):
                r[key] = val.isoformat()
        if "id" not in r:
            r["id"] = str(r.get("_id", ""))
    
    result = {"items": docs, "total": total, "page": page, "limit": limit}
    
    # Use json.dumps with default=str to handle any remaining BSON types
    return JSONResponse(content=json.loads(json.dumps(result, default=str)))


@router.get("/{venue_id}/recipes/engineered/trash")
async def get_recipe_trash(
    venue_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get trashed recipes from MongoDB."""
    db = get_database()
    
    query = {"deleted": True}
    total = await db.recipes.count_documents(query)
    skip = (page - 1) * limit
    recipes = await db.recipes.find(query).skip(skip).limit(limit).to_list(length=limit)
    
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
    res1 = await db.recipes.update_many(
        {"id": {"$in": ids}}, {"$set": updates}
    )
    
    # Also try ObjectId
    obj_ids = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
    count = res1.modified_count
    if obj_ids:
        res2 = await db.recipes.update_many(
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
    res1 = await db.recipes.delete_many({"id": {"$in": request.recipe_ids}})
    obj_ids = [ObjectId(i) for i in request.recipe_ids if ObjectId.is_valid(i)]
    total = res1.deleted_count
    if obj_ids:
        res2 = await db.recipes.delete_many({"_id": {"$in": obj_ids}})
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


@router.get("/{venue_id}/inventory")
async def get_venue_inventory(venue_id: str):
    """Get inventory items for a venue from MongoDB."""
    db = get_database()
    items = await db.inventory_items.find({}).to_list(length=500)
    for item in items:
        item["_id"] = str(item["_id"])
    return items


@router.get("/{venue_id}/menu/categories")
async def get_venue_menu_categories(
    venue_id: str,
    menu_id: Optional[str] = Query(None)
):
    """Get menu categories for a venue."""
    db = get_database()
    query = {}
    if menu_id:
        query["menu_id"] = menu_id
    categories = await db.menu_categories.find(query).to_list(length=200)
    for c in categories:
        c["_id"] = str(c["_id"])
    return categories


@router.get("/{venue_id}/menu/items")
async def get_venue_menu_items(
    venue_id: str,
    category_id: Optional[str] = Query(None),
    menu_id: Optional[str] = Query(None),
    include_inactive: Optional[bool] = Query(None),
    all: Optional[bool] = Query(None)
):
    """Get menu items for a venue."""
    db = get_database()
    query = {}
    if category_id:
        query["category_id"] = category_id
    if menu_id:
        query["menu_id"] = menu_id
    if not include_inactive and not all:
        query["is_active"] = True
    items = await db.menu_items.find(query).to_list(length=500)
    for item in items:
        item["_id"] = str(item["_id"])
    return items


@router.get("/{venue_id}/menus")
async def get_venue_menus(venue_id: str):
    """Get menus for a venue."""
    db = get_database()
    menus = await db.menus.find({}).to_list(length=50)
    for m in menus:
        m["_id"] = str(m["_id"])
    return menus


@router.get("/{venue_id}/menus/active")
async def get_active_menu(venue_id: str):
    """Get the active menu for a venue."""
    db = get_database()
    menu = await db.menus.find_one({"is_active": True})
    if not menu:
        menus = await db.menus.find({}).to_list(length=1)
        menu = menus[0] if menus else None
    if menu:
        menu["_id"] = str(menu["_id"])
    return menu or {
        "id": "default", "name": "No Active Menu", "is_active": False
    }


# ==================== STATS ====================

@router.get("/{venue_id}/stats")
async def get_venue_stats(venue_id: str):
    """Real-time venue statistics from MongoDB."""
    db = get_database()

    # Count open orders
    open_orders = await db.orders.count_documents({
        "venue_id": venue_id,
        "status": {"$in": ["open", "in_progress", "pending", "new"]}
    })

    # Count tables
    total_tables = await db.tables.count_documents({"venue_id": venue_id})
    if total_tables == 0:
        total_tables = await db.tables.count_documents({})

    occupied_tables = await db.tables.count_documents({
        "status": {"$in": ["occupied", "busy", "in_use"]}
    })

    # KDS tickets pending
    pending_kds = await db.kds_tickets.count_documents({
        "status": {"$in": ["new", "pending", "in_progress"]}
    })

    # Low stock items (below reorder point or min_stock)
    low_stock_pipeline = [
        {"$match": {"$expr": {"$lte": ["$current_stock", "$reorder_point"]}}},
        {"$count": "total"}
    ]
    low_stock_result = await db.inventory_items.aggregate(low_stock_pipeline).to_list(1)
    low_stock = low_stock_result[0]["total"] if low_stock_result else 0

    # Revenue today
    from datetime import datetime, timezone, timedelta
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    revenue_pipeline = [
        {"$match": {
            "venue_id": venue_id,
            "status": {"$in": ["completed", "closed", "paid"]},
            "created_at": {"$gte": today_start.isoformat()}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_cents"}, "count": {"$sum": 1}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    revenue_cents = revenue_result[0]["total"] if revenue_result else 0
    orders_today = revenue_result[0]["count"] if revenue_result else 0

    # Active staff
    active_staff = await db.shifts.count_documents({
        "status": {"$in": ["active", "clocked_in"]}
    })

    return {
        "open_orders": open_orders,
        "total_tables": total_tables,
        "occupied_tables": occupied_tables,
        "pending_kds_tickets": pending_kds,
        "low_stock_items": low_stock,
        "revenue_today_cents": revenue_cents,
        "orders_today": orders_today,
        "active_staff": active_staff,
    }


# ==================== ORDERS ====================

@router.get("/{venue_id}/orders")
async def get_venue_orders(
    venue_id: str,
    status: Optional[str] = Query(None),
    table_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    """Get orders for a venue with optional filtering."""
    db = get_database()
    query = {"venue_id": venue_id}
    if status:
        query["status"] = status
    if table_id:
        query["table_id"] = table_id

    orders = await db.orders.find(query).sort("created_at", -1).to_list(length=limit)

    if not orders:
        # Return all orders if no venue-specific ones found
        query_all = {}
        if status:
            query_all["status"] = status
        if table_id:
            query_all["table_id"] = table_id
        orders = await db.orders.find(query_all).sort("created_at", -1).to_list(length=limit)

    for o in orders:
        o["_id"] = str(o["_id"])
    return orders


# ==================== SHIFTS ====================

@router.get("/{venue_id}/shifts")
async def get_venue_shifts(venue_id: str):
    """Get shifts for a venue."""
    db = get_database()
    shifts = await db.shifts.find({"venue_id": venue_id}).sort("start_time", -1).to_list(length=100)
    if not shifts:
        shifts = await db.shifts.find({}).sort("start_time", -1).to_list(length=100)
    for s in shifts:
        s["_id"] = str(s["_id"])
    return shifts


# ==================== RECIPES ====================

@router.get("/{venue_id}/recipes")
async def get_venue_recipes(venue_id: str):
    """Get recipes for a venue."""
    db = get_database()
    recipes = await db.recipes.find({}).to_list(length=500)
    for r in recipes:
        r["_id"] = str(r["_id"])
    return recipes


# ==================== KDS ====================

@router.get("/{venue_id}/kds/tickets")
async def get_kds_tickets(
    venue_id: str,
    status: Optional[str] = Query(None)
):
    """Get KDS tickets for a venue."""
    db = get_database()
    query = {"venue_id": venue_id}
    if status:
        query["status"] = status
    tickets = await db.kds_tickets.find(query).sort("created_at", -1).to_list(length=100)
    if not tickets:
        tickets = await db.kds_tickets.find({}).sort("created_at", -1).to_list(length=100)
    for t in tickets:
        t["_id"] = str(t["_id"])
    return tickets


@router.get("/{venue_id}/kds/stations")
async def get_kds_stations(venue_id: str):
    """Get KDS stations for a venue."""
    db = get_database()
    stations = await db.kds_stations.find({"venue_id": venue_id}).to_list(length=20)
    if not stations:
        stations = await db.kds_stations.find({}).to_list(length=20)
    for s in stations:
        s["_id"] = str(s["_id"])
    return stations


# ==================== SUPPLIERS ====================

@router.get("/{venue_id}/suppliers")
async def get_venue_suppliers(venue_id: str):
    """Get suppliers for a venue."""
    db = get_database()
    suppliers = await db.suppliers.find({}).to_list(length=200)
    for s in suppliers:
        s["_id"] = str(s["_id"])
    return suppliers


# ==================== PURCHASE ORDERS ====================

@router.get("/{venue_id}/purchase-orders")
async def get_venue_purchase_orders(venue_id: str):
    """Get purchase orders for a venue."""
    db = get_database()
    pos = await db.purchase_orders.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=100)
    if not pos:
        pos = await db.purchase_orders.find({}).sort("created_at", -1).to_list(length=100)
    for p in pos:
        p["_id"] = str(p["_id"])
    return pos


# ==================== WASTE LOG ====================

@router.get("/{venue_id}/waste-log")
async def get_venue_waste_log(venue_id: str):
    """Get waste log entries for a venue."""
    db = get_database()
    waste = await db.waste_logs.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=200)
    if not waste:
        waste = await db.waste_logs.find({}).sort("created_at", -1).to_list(length=200)
    for w in waste:
        w["_id"] = str(w["_id"])
    return waste


# ==================== STOCK TRANSFERS ====================

@router.get("/{venue_id}/stock-transfers")
async def get_stock_transfers(venue_id: str):
    """Get stock transfers for a venue."""
    db = get_database()
    transfers = await db.stock_transfers.find({}).sort("created_at", -1).to_list(length=100)
    for t in transfers:
        t["_id"] = str(t["_id"])
    return transfers


# ==================== RESERVATIONS ====================

@router.get("/{venue_id}/reservations")
async def get_venue_reservations(venue_id: str):
    """Get reservations for a venue."""
    db = get_database()
    reservations = await db.reservations.find({"venue_id": venue_id}).sort("date", -1).to_list(length=200)
    if not reservations:
        reservations = await db.reservations.find({}).sort("date", -1).to_list(length=200)
    for r in reservations:
        r["_id"] = str(r["_id"])
    return reservations


# ==================== FLOOR PLAN ====================

@router.get("/{venue_id}/floor-plan")
async def get_floor_plan(venue_id: str):
    """Get floor plan data for a venue."""
    db = get_database()
    plan = await db.floor_plans.find_one({"venue_id": venue_id})
    if not plan:
        plan = await db.floor_plans.find_one({})
    if plan:
        plan["_id"] = str(plan["_id"])
    return plan or {"venue_id": venue_id, "zones": [], "tables": []}


# ==================== GUESTS / CRM ====================

@router.get("/{venue_id}/guests")
async def get_venue_guests(venue_id: str):
    """Get guest profiles for CRM."""
    db = get_database()
    guests = await db.guests.find({}).sort("last_visit", -1).to_list(length=500)
    for g in guests:
        g["_id"] = str(g["_id"])
    return guests


# ==================== NOTIFICATIONS ====================

@router.get("/{venue_id}/notifications")
async def get_venue_notifications(venue_id: str):
    """Get notifications for a venue."""
    db = get_database()
    notifications = await db.notifications.find(
        {"venue_id": venue_id}
    ).sort("created_at", -1).to_list(length=50)
    if not notifications:
        notifications = await db.notifications.find({}).sort("created_at", -1).to_list(length=50)
    for n in notifications:
        n["_id"] = str(n["_id"])
    return notifications