"""
Inventory Data Routes — Ingredients, Stock, Procurement, Sales, Variance
Serves data from Apicbase-imported collections with proper venue filtering.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_inventory_data_router():
    router = APIRouter(tags=["inventory_data"])

    # ─── INGREDIENTS ──────────────────────────────────────────
    @router.get("/inventory/ingredients")
    async def list_ingredients(
        venue_id: str,
        search: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        has_allergens: Optional[bool] = None,
        supplier_id: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List ingredients with search, filters, and pagination."""
        await check_venue_access(current_user, venue_id)

        query = {"$or": [{"venue_id": venue_id}, {"venues": venue_id}]}

        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        if category:
            query["category"] = category
        if subcategory:
            query["subcategory"] = subcategory
        if has_allergens is True:
            query["allergens"] = {"$ne": {}}
        if supplier_id:
            query["supplier_id"] = supplier_id

        total = await db.ingredients.count_documents(query)
        skip = (page - 1) * limit

        items = await db.ingredients.find(query, {"_id": 0}).sort(
            "name", 1
        ).skip(skip).limit(limit).to_list(limit)

        # Get categories for filters
        categories = await db.ingredients.distinct("category", {"venue_id": venue_id})

        return {
            "ingredients": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "categories": [c for c in categories if c],
        }

    @router.get("/inventory/ingredients/{ingredient_id}")
    async def get_ingredient(
        ingredient_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Get ingredient detail with linked packages and stock."""
        ingredient = await db.ingredients.find_one(
            {"id": ingredient_id}, {"_id": 0}
        )
        if not ingredient:
            raise HTTPException(404, "Ingredient not found")

        # Get linked packages
        packages = await db.ingredient_packages.find(
            {"ingredient_id": ingredient_id}, {"_id": 0}
        ).to_list(50)

        # Get stock snapshots
        stock = await db.stock_snapshots.find(
            {"ingredient_id": ingredient_id}, {"_id": 0}
        ).to_list(10)

        # Get procurement history
        procurement = await db.procurement_history.find(
            {"ingredient_name": ingredient.get("name")}, {"_id": 0}
        ).sort("created_at", -1).to_list(20)

        return {
            "ingredient": ingredient,
            "packages": packages,
            "current_stock": stock,
            "procurement_history": procurement,
        }

    @router.get("/inventory/ingredients/categories/list")
    async def list_ingredient_categories(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Get available ingredient categories and subcategories."""
        await check_venue_access(current_user, venue_id)

        categories = await db.ingredients.distinct("category")
        subcategories = await db.ingredients.distinct("subcategory")

        return {
            "categories": sorted([c for c in categories if c]),
            "subcategories": sorted([s for s in subcategories if s]),
        }

    # ─── STOCK SNAPSHOTS ──────────────────────────────────────
    @router.get("/inventory/stock")
    async def list_stock(
        venue_id: str,
        search: Optional[str] = None,
        category: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List current stock levels for a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if search:
            query["ingredient_name"] = {"$regex": search, "$options": "i"}
        if category:
            query["accounting_category"] = category

        total = await db.stock_snapshots.count_documents(query)
        skip = (page - 1) * limit

        items = await db.stock_snapshots.find(query, {"_id": 0}).sort(
            "ingredient_name", 1
        ).skip(skip).limit(limit).to_list(limit)

        # Calculate totals
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": None,
                "total_value": {"$sum": "$current_stock_value"},
                "total_items": {"$sum": 1},
            }},
        ]
        agg = await db.stock_snapshots.aggregate(pipeline).to_list(1)
        totals = agg[0] if agg else {"total_value": 0, "total_items": 0}

        return {
            "stock_items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "total_value": totals.get("total_value", 0),
            "total_items": totals.get("total_items", 0),
        }

    # ─── PROCUREMENT HISTORY ──────────────────────────────────
    @router.get("/inventory/procurement")
    async def list_procurement(
        venue_id: str,
        supplier_name: Optional[str] = None,
        search: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List procurement history for a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if supplier_name:
            query["supplier_name"] = supplier_name
        if search:
            query["ingredient_name"] = {"$regex": search, "$options": "i"}

        total = await db.procurement_history.count_documents(query)
        skip = (page - 1) * limit

        items = await db.procurement_history.find(query, {"_id": 0}).sort(
            "created_at", -1
        ).skip(skip).limit(limit).to_list(limit)

        # Supplier summary
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": "$supplier_name",
                "total_amount": {"$sum": "$actual_price"},
                "order_count": {"$sum": 1},
            }},
            {"$sort": {"total_amount": -1}},
        ]
        supplier_summary = await db.procurement_history.aggregate(
            pipeline
        ).to_list(50)

        return {
            "procurement_items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "supplier_summary": supplier_summary,
        }

    # ─── SALES HISTORY ────────────────────────────────────────
    @router.get("/inventory/sales")
    async def list_sales(
        venue_id: str,
        category_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List sales history for a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if category_type:
            query["category_type"] = category_type
        if search:
            query["product_name"] = {"$regex": search, "$options": "i"}

        total = await db.sales_history.count_documents(query)
        skip = (page - 1) * limit

        items = await db.sales_history.find(query, {"_id": 0}).sort(
            "sales_amount", -1
        ).skip(skip).limit(limit).to_list(limit)

        # Category summary
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": "$category_type",
                "total_sales": {"$sum": "$sales_amount"},
                "product_count": {"$sum": 1},
            }},
        ]
        category_summary = await db.sales_history.aggregate(
            pipeline
        ).to_list(20)

        return {
            "sales_items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "category_summary": category_summary,
        }

    # ─── VARIANCE REPORTS ─────────────────────────────────────
    @router.get("/inventory/variance")
    async def list_variance(
        venue_id: str,
        search: Optional[str] = None,
        category: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List stock variance reports for a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if search:
            query["ingredient_name"] = {"$regex": search, "$options": "i"}
        if category:
            query["accounting_category"] = category

        total = await db.variance_reports.count_documents(query)
        skip = (page - 1) * limit

        items = await db.variance_reports.find(query, {"_id": 0}).sort(
            "stock_value_variance", 1
        ).skip(skip).limit(limit).to_list(limit)

        # Summary
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": None,
                "total_actual_value": {"$sum": "$actual_stock_value"},
                "total_theoretical_value": {"$sum": "$theoretical_stock_value"},
                "total_variance": {"$sum": "$stock_value_variance"},
                "item_count": {"$sum": 1},
            }},
        ]
        summary = await db.variance_reports.aggregate(pipeline).to_list(1)

        return {
            "variance_items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "summary": summary[0] if summary else {},
        }

    # ─── STOCK COUNTS ─────────────────────────────────────────
    @router.get("/inventory/stock-counts")
    async def list_stock_counts(
        venue_id: str,
        search: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List stock count records for a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if search:
            query["ingredient_name"] = {"$regex": search, "$options": "i"}

        total = await db.stock_counts.count_documents(query)
        skip = (page - 1) * limit

        items = await db.stock_counts.find(query, {"_id": 0}).sort(
            "ingredient_name", 1
        ).skip(skip).limit(limit).to_list(limit)

        return {
            "stock_count_items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }

    # ─── SELL PRICES ──────────────────────────────────────────
    @router.get("/inventory/sell-prices")
    async def list_sell_prices(
        venue_id: str,
        search: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List sell prices for recipes at a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"$or": [{"venue_id": venue_id}, {"venue_id": "all"}]}
        if search:
            query["recipe_name"] = {"$regex": search, "$options": "i"}

        total = await db.outlet_sell_prices.count_documents(query)
        skip = (page - 1) * limit

        items = await db.outlet_sell_prices.find(query, {"_id": 0}).sort(
            "recipe_name", 1
        ).skip(skip).limit(limit).to_list(limit)

        return {
            "sell_prices": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }

    # ─── PRICEBOOK ────────────────────────────────────────────
    @router.get("/inventory/pricebook")
    async def list_pricebook(
        search: Optional[str] = None,
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        """List pricebook items."""
        query = {"source": "apicbase"}
        if search:
            query["product_name"] = {"$regex": search, "$options": "i"}

        total = await db.pricebook.count_documents(query)
        skip = (page - 1) * limit

        items = await db.pricebook.find(query, {"_id": 0}).sort(
            "product_name", 1
        ).skip(skip).limit(limit).to_list(limit)

        return {
            "pricebook_items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
        }

    # ─── DASHBOARD STATS ──────────────────────────────────────
    @router.get("/inventory/dashboard")
    async def inventory_dashboard(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        """Get inventory dashboard stats for a venue."""
        await check_venue_access(current_user, venue_id)

        venue_query = {"$or": [{"venue_id": venue_id}, {"venues": venue_id}]}

        ingredient_count = await db.ingredients.count_documents(venue_query)
        supplier_count = await db.suppliers.count_documents(venue_query)
        package_count = await db.ingredient_packages.count_documents({})

        # Stock value
        stock_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": None,
                "total_value": {"$sum": "$current_stock_value"},
                "item_count": {"$sum": 1},
            }},
        ]
        stock_agg = await db.stock_snapshots.aggregate(stock_pipeline).to_list(1)
        stock_stats = stock_agg[0] if stock_agg else {"total_value": 0, "item_count": 0}

        # Procurement spend
        proc_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": None,
                "total_spend": {"$sum": "$actual_price"},
                "order_count": {"$sum": 1},
            }},
        ]
        proc_agg = await db.procurement_history.aggregate(proc_pipeline).to_list(1)
        proc_stats = proc_agg[0] if proc_agg else {"total_spend": 0, "order_count": 0}

        # Variance
        var_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {
                "_id": None,
                "total_variance": {"$sum": "$stock_value_variance"},
            }},
        ]
        var_agg = await db.variance_reports.aggregate(var_pipeline).to_list(1)
        var_stats = var_agg[0] if var_agg else {"total_variance": 0}

        return {
            "ingredients": ingredient_count,
            "suppliers": supplier_count,
            "packages": package_count,
            "stock_value": stock_stats.get("total_value", 0),
            "stock_items": stock_stats.get("item_count", 0),
            "procurement_spend": proc_stats.get("total_spend", 0),
            "procurement_orders": proc_stats.get("order_count", 0),
            "stock_variance": var_stats.get("total_variance", 0),
        }

    return router
