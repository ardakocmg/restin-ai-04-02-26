"""Inventory Items Routes with Detail Drawer endpoint"""
from fastapi import APIRouter, HTTPException, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.search import parse_list_query
from services.inventory_detail.item_detail_aggregate import item_detail_service


def create_inventory_items_router():
    router = APIRouter(tags=["inventory_items"])

    @router.get("/inventory/items")
    async def list_inventory_items(
        venue_id: str = Query(...),
        q: str = Query(None),
        filters: str = Query(None),  # JSON string
        page: int = Query(1),
        limit: int = Query(50),
        sort: str = Query("name"),
        current_user: dict = Depends(get_current_user)
    ):
        """List inventory items with search and filters"""
        await check_venue_access(current_user, venue_id)
        
        # Parse query
        import json
        filter_dict = json.loads(filters) if filters else {}
        query_params = parse_list_query(q, filter_dict, page, limit, sort)
        
        # Build MongoDB query
        mongo_query = {"venue_id": venue_id}
        
        # Search
        if query_params["q"]:
            mongo_query["$or"] = [
                {"name": {"$regex": query_params["q"], "$options": "i"}},
                {"display_id": {"$regex": query_params["q"], "$options": "i"}},
                {"category": {"$regex": query_params["q"], "$options": "i"}}
            ]
        
        # Filters
        if query_params["filters"].get("category"):
            mongo_query["category"] = query_params["filters"]["category"]
        
        if query_params["filters"].get("status") == "LOW":
            mongo_query["$expr"] = {"$lte": ["$quantity", "$min_quantity"]}
        elif query_params["filters"].get("status") == "NEG":
            mongo_query["quantity"] = {"$lt": 0}
        
        # Query with pagination
        skip = (query_params["page"] - 1) * query_params["limit"]
        
        items = await db.inventory_items.find(
            mongo_query,
            {"_id": 0}
        ).sort(query_params["sort"], 1).skip(skip).limit(query_params["limit"]).to_list(query_params["limit"])
        
        total = await db.inventory_items.count_documents(mongo_query)
        
        return {
            "items": items,
            "pagination": {
                "page": query_params["page"],
                "limit": query_params["limit"],
                "total": total,
                "pages": (total + query_params["limit"] - 1) // query_params["limit"]
            }
        }

    @router.get("/inventory/items/{sku_id}/detail")
    async def get_item_detail(
        sku_id: str,
        venue_id: str = Query(...),
        mov_from: str = Query(None),
        mov_to: str = Query(None),
        mov_limit: int = Query(50),
        current_user: dict = Depends(get_current_user)
    ):
        """Get complete item detail for drawer (ALL tabs in single call)"""
        await check_venue_access(current_user, venue_id)
        
        detail = await item_detail_service.get_item_detail(
            venue_id, sku_id, mov_from, mov_to, mov_limit
        )
        
        if not detail:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return detail

    @router.put("/inventory/items/{sku_id}")
    async def update_inventory_item(
        sku_id: str,
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        """Update inventory item (optional fields: min_stock, image_url, tags, category)"""
        await check_venue_access(current_user, venue_id)
        
        # Only allow updating specific fields
        allowed_fields = ["min_stock", "image_url", "tags", "category", "pricing_basis", "preferred_supplier_id"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.inventory_items.update_one(
            {"id": sku_id, "venue_id": venue_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return {"ok": True, "message": "Item updated"}

    return router
