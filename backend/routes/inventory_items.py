"""Inventory Items Routes with Detail Drawer endpoint"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.role_guard import require_manager
from core.search import parse_list_query
from services.inventory_detail.item_detail_aggregate import item_detail_service


def create_inventory_items_router():
    router = APIRouter(tags=["inventory_items"])

    @router.get("/inventory/items", dependencies=[Depends(require_manager)])
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

    @router.get("/inventory/items/{sku_id}/detail", dependencies=[Depends(require_manager)])
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

    @router.put("/inventory/items/{sku_id}", dependencies=[Depends(require_manager)])
    async def update_inventory_item(
        sku_id: str,
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        """Update inventory item (optional fields: min_stock, image_url, tags, category)"""
        await check_venue_access(current_user, venue_id)
        
        # Only allow updating specific fields
        allowed_fields = [
            "min_stock", "image_url", "tags", "category", "pricing_basis",
            "preferred_supplier_id", "allergens", "nutrition", "description",
            "storage_instructions", "shelf_life_days", "origin_country", "is_organic"
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.inventory_items.update_one(
            {"id": sku_id, "venue_id": venue_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return {"ok": True, "message": "Item updated"}

    @router.post("/inventory/items/bulk-image-update", dependencies=[Depends(require_manager)])
    async def bulk_update_images(
        venue_id: str = Query(...),
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Bulk update image_url for multiple inventory items.
        Payload: { "updates": [{"item_id": "...", "image_url": "https://..."}] }
        """
        await check_venue_access(current_user, venue_id)

        updates = payload.get("updates", [])
        if not updates:
            raise HTTPException(400, "No updates provided")

        now = datetime.now(timezone.utc).isoformat()
        updated = 0
        errors = []

        for entry in updates:
            item_id = entry.get("item_id")
            image_url = entry.get("image_url", "")
            if not item_id:
                errors.append({"item_id": None, "error": "Missing item_id"})
                continue

            result = await db.inventory_items.update_one(
                {"id": item_id, "venue_id": venue_id},
                {"$set": {"image_url": image_url, "updated_at": now}}
            )
            if result.matched_count > 0:
                updated += 1
            else:
                errors.append({"item_id": item_id, "error": "Item not found"})

        return {
            "message": f"Updated images for {updated} items",
            "updated": updated,
            "errors": errors
        }

    @router.get("/inventory/ordering-suggestions", dependencies=[Depends(require_manager)])
    async def get_ordering_suggestions(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Compute ordering suggestions: items at or below reorder point."""
        await check_venue_access(current_user, venue_id)
        
        # Items where quantity <= min_quantity * 1.5
        items = await db.inventory_items.find(
            {
                "venue_id": venue_id,
                "$expr": {"$lte": ["$quantity", {"$multiply": [{"$ifNull": ["$min_quantity", 0]}, 1.5]}]},
                "min_quantity": {"$gt": 0}
            },
            {"_id": 0}
        ).sort("quantity", 1).to_list(500)
        
        suggestions = []
        supplier_groups = {}
        
        for item in items:
            stock = float(item.get("quantity", 0) or 0)
            min_stock = float(item.get("min_quantity", 0) or 0)
            max_stock = float(item.get("max_quantity", 0) or min_stock * 3)
            unit_cost = float(item.get("unit_cost", 0) or 0)
            order_qty = max(0, max_stock - stock)
            
            # Determine urgency
            if stock <= 0:
                urgency = "critical"
            elif stock <= min_stock * 0.5:
                urgency = "low"
            elif stock <= min_stock:
                urgency = "reorder"
            else:
                urgency = "optimal"
            
            supplier = item.get("supplier_name") or item.get("preferred_supplier") or "—"
            
            suggestion = {
                "id": item.get("id"),
                "name": item.get("name", "Unknown"),
                "category": item.get("category", "—"),
                "current_stock": stock,
                "min_stock": min_stock,
                "max_stock": max_stock,
                "suggested_qty": round(order_qty, 2),
                "unit": item.get("unit", "units"),
                "unit_cost": unit_cost,
                "est_cost": round(order_qty * unit_cost, 2),
                "supplier": supplier,
                "urgency": urgency,
            }
            suggestions.append(suggestion)
            
            # Group by supplier for PO generation
            if supplier not in supplier_groups:
                supplier_groups[supplier] = {"items": 0, "total_cost": 0}
            supplier_groups[supplier]["items"] += 1
            supplier_groups[supplier]["total_cost"] += suggestion["est_cost"]
        
        # Sort: critical first, then low, reorder, optimal
        urgency_order = {"critical": 0, "low": 1, "reorder": 2, "optimal": 3}
        suggestions.sort(key=lambda x: urgency_order.get(x["urgency"], 3))
        
        return {
            "suggestions": suggestions,
            "total_items": len(suggestions),
            "total_est_cost": round(sum(s["est_cost"] for s in suggestions), 2),
            "by_urgency": {
                "critical": sum(1 for s in suggestions if s["urgency"] == "critical"),
                "low": sum(1 for s in suggestions if s["urgency"] == "low"),
                "reorder": sum(1 for s in suggestions if s["urgency"] == "reorder"),
                "optimal": sum(1 for s in suggestions if s["urgency"] == "optimal"),
            },
            "supplier_groups": supplier_groups,
        }

    return router

