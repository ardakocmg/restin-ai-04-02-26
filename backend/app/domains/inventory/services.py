from typing import List, Optional
from datetime import datetime
from .models import InventoryItem, StockAdjustment

class InventoryService:
    @staticmethod
    def calculate_valuation(items: List[InventoryItem]) -> int:
        return sum(int(item.stock * item.price_cents) for item in items)

    @staticmethod
    def get_reorder_list(items: List[InventoryItem]) -> List[InventoryItem]:
        return [
            item for item in items 
            if item.stock <= (item.reorder_point or item.min_stock)
        ]
    
    @staticmethod
    def adjust_stock(items: List[InventoryItem], adjustment: StockAdjustment) -> Optional[InventoryItem]:
        target = next((i for i in items if i.id == adjustment.item_id), None)
        if target:
            target.stock += adjustment.quantity_change
            # In a real app, we'd log the transaction to a DB here
        return target
