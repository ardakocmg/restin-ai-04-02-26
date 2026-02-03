from datetime import datetime, timezone
from typing import List, Optional
from inventory.models import InventoryItem, InventoryItemCreate

class InventoryItemService:
    def __init__(self, db):
        self.db = db
        self.col = db.inventory_items

    async def create_item(self, data: InventoryItemCreate, user_id: str) -> InventoryItem:
        item = InventoryItem(
            venue_id=data.venue_id,
            sku=data.sku,
            name=data.name,
            category=data.category,
            base_unit=data.base_unit,
            created_by=user_id
        )
        
        await self.col.insert_one(item.model_dump())
        return item

    async def get_item(self, item_id: str, venue_id: str) -> Optional[InventoryItem]:
        doc = await self.col.find_one({"id": item_id, "venue_id": venue_id}, {"_id": 0})
        return InventoryItem(**doc) if doc else None

    async def list_items(self, venue_id: str, query: Optional[str] = None) -> List[InventoryItem]:
        filter_query = {"venue_id": venue_id, "is_active": True}
        
        if query:
            filter_query["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"sku": {"$regex": query, "$options": "i"}}
            ]
        
        cursor = self.col.find(filter_query, {"_id": 0}).sort("name", 1)
        docs = await cursor.to_list(1000)
        return [InventoryItem(**doc) for doc in docs]
