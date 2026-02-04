from fastapi import APIRouter, HTTPException, Body
from typing import List
import json
import os
from .models import InventoryItem, StockAdjustment
from .services import InventoryService

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

# Reuse Mock Loader Pattern (Replace with DB Repo later)
def load_mock_inventory() -> List[InventoryItem]:
    try:
        path = os.path.join(os.path.dirname(__file__), "../../../../frontend/src/data/seed-master.json")
        with open(path, 'r') as f:
            data = json.load(f)
            return [InventoryItem(**i) for i in data.get("inventory", [])]
    except Exception as e:
        print(f"Error loading seeds: {e}")
        return []

@router.get("/items", response_model=List[InventoryItem])
def get_inventory():
    return load_mock_inventory()

@router.get("/valuation")
def get_valuation():
    items = load_mock_inventory()
    total_cents = InventoryService.calculate_valuation(items)
    return {"total_valuation_cents": total_cents, "currency": "EUR"}

@router.get("/alerts/reorder")
def get_reorder_alerts():
    items = load_mock_inventory()
    return InventoryService.get_reorder_list(items)

@router.post("/adjust")
def adjust_stock(adjustment: StockAdjustment):
    items = load_mock_inventory()
    updated_item = InventoryService.adjust_stock(items, adjustment)
    if not updated_item:
        raise HTTPException(404, "Item not found")
    return {"status": "success", "new_stock": updated_item.stock}
