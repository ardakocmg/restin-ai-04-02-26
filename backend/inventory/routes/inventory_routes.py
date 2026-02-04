from fastapi import APIRouter, Depends, Header
from typing import Optional, List
from core.database import db
from core.dependencies import get_current_user
from inventory.services.inventory_item_service import InventoryItemService
from inventory.services.stock_ledger_service import StockLedgerService
from inventory.services.purchasing_service import PurchasingService
from inventory.services.recipe_service import RecipeService
from inventory.models import (
    InventoryItemCreate, PurchaseOrderCreate, RecipeCreate, SupplierCreate
)
try:
    from inventory.services.supplier_service import SupplierService
    from inventory.services.stock_count_service import StockCountService, WasteService
    from inventory.models.stock_count import StockCountLine, WasteEntry
except ImportError:
    SupplierService = None
    StockCountService = None
    WasteService = None

def create_inventory_routes():
    router = APIRouter(prefix="/inventory", tags=["inventory"])
    item_service = InventoryItemService(db)
    ledger_service = StockLedgerService(db)
    purchasing_service = PurchasingService(db)
    recipe_service = RecipeService(db)
    supplier_service = SupplierService(db) if SupplierService else None
    stock_count_service = StockCountService(db) if StockCountService else None
    waste_service = WasteService(db) if WasteService else None

    # Items
    @router.get("/items")
    async def list_items(
        venue_id: str,
        q: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        items = await item_service.list_items(venue_id, q)
        
        # Enrich with current stock
        enriched = []
        for item in items:
            stock = await ledger_service.get_current_stock(item.id, venue_id)
            item_dict = item.model_dump()
            item_dict["current_stock"] = stock
            enriched.append(item_dict)
        
        return {"ok": True, "items": enriched}

    @router.post("/items")
    async def create_item(
        data: InventoryItemCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        item = await item_service.create_item(data, current_user["id"])
        return {"ok": True, "item": item.model_dump()}

    @router.get("/items/{item_id}")
    async def get_item(
        item_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        item = await item_service.get_item(item_id, venue_id)
        if not item:
            return {"ok": False, "error": {"code": "NOT_FOUND"}}
        
        stock = await ledger_service.get_current_stock(item_id, venue_id)
        ledger = await ledger_service.get_item_ledger(item_id, venue_id)
        
        return {
            "ok": True,
            "item": item.model_dump(),
            "current_stock": stock,
            "ledger": [e.model_dump() for e in ledger]
        }

    # Purchase Orders
    @router.get("/purchase-orders")
    async def list_pos(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        pos = await purchasing_service.list_pos(venue_id, status)
        return {"ok": True, "purchase_orders": [po.model_dump() for po in pos]}

    @router.post("/purchase-orders")
    async def create_po(
        data: PurchaseOrderCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        po = await purchasing_service.create_po(data, current_user["id"])
        return {"ok": True, "purchase_order": po.model_dump()}

    @router.post("/purchase-orders/{po_id}/approve")
    async def approve_po(
        po_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await purchasing_service.approve_po(po_id, venue_id, current_user["id"])
        return {"ok": True}

    @router.post("/purchase-orders/{po_id}/receive")
    async def receive_po(
        po_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await purchasing_service.receive_po(po_id, venue_id, current_user["id"])
        return {"ok": True}

    # Suppliers
    @router.get("/suppliers")
    async def list_suppliers(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        if supplier_service:
            suppliers = await supplier_service.list_suppliers(venue_id)
            return {"ok": True, "suppliers": [s.model_dump() for s in suppliers]}
        return {"ok": True, "suppliers": []}

    @router.post("/suppliers")
    async def create_supplier(
        data: SupplierCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        if supplier_service:
            supplier = await supplier_service.create_supplier(data, current_user["id"])
            return {"ok": True, "supplier": supplier.model_dump()}
        return {"ok": False, "error": {"code": "NOT_IMPLEMENTED"}}

    # Stock Counts
    @router.post("/counts/start")
    async def start_stock_count(
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        if stock_count_service:
            count = await stock_count_service.start_count(venue_id, current_user["id"])
            return {"ok": True, "count": count.model_dump()}
        return {"ok": False, "error": {"code": "NOT_IMPLEMENTED"}}

    @router.post("/counts/{count_id}/lines")
    async def submit_count_line(
        count_id: str,
        venue_id: str,
        line: StockCountLine,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        if stock_count_service:
            await stock_count_service.submit_count_line(count_id, line, venue_id)
            return {"ok": True}
        return {"ok": False, "error": {"code": "NOT_IMPLEMENTED"}}

    @router.post("/counts/{count_id}/complete")
    async def complete_count(
        count_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        if stock_count_service:
            await stock_count_service.complete_count(count_id, venue_id, current_user["id"])
            return {"ok": True}
        return {"ok": False, "error": {"code": "NOT_IMPLEMENTED"}}

    # Waste
    @router.post("/waste")
    async def log_waste(
        waste: WasteEntry,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        if waste_service:
            waste.created_by = current_user["id"]
            result = await waste_service.log_waste(waste, current_user["id"])
            return {"ok": True, "waste": result.model_dump()}
        return {"ok": False, "error": {"code": "NOT_IMPLEMENTED"}}

    @router.get("/waste")
    async def list_waste(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        if waste_service:
            waste_entries = await waste_service.list_waste(venue_id)
            return {"ok": True, "waste": [w.model_dump() for w in waste_entries]}
        return {"ok": True, "waste": []}

    # Recipes (continued)
    @router.get("/recipes")
    async def list_recipes(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        recipes = await recipe_service.list_recipes(venue_id)
        return {"ok": True, "recipes": [r.model_dump() for r in recipes]}

    @router.post("/recipes")
    async def create_recipe(
        data: RecipeCreate,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        recipe = await recipe_service.create_recipe(data, current_user["id"])
        return {"ok": True, "recipe": recipe.model_dump()}

    @router.post("/recipes/{recipe_id}/recompute-cost")
    async def recompute_recipe_cost(
        recipe_id: str,
        venue_id: str,
        idempotency_key: Optional[str] = Header(None),
        current_user: dict = Depends(get_current_user)
    ):
        await recipe_service.recompute_cost(recipe_id, venue_id)
        return {"ok": True}

    return router
