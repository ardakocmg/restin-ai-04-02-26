from datetime import datetime, timezone
from typing import List, Optional
from inventory.models import Supplier, SupplierCreate

class SupplierService:
    def __init__(self, db):
        self.db = db
        self.col = db.suppliers

    async def create_supplier(self, data: SupplierCreate, user_id: str) -> Supplier:
        supplier = Supplier(
            venue_id=data.venue_id,
            name=data.name,
            code=data.code,
            created_by=user_id
        )
        await self.col.insert_one(supplier.model_dump())
        return supplier

    async def list_suppliers(self, venue_id: str) -> List[Supplier]:
        cursor = self.col.find({"venue_id": venue_id, "is_active": True}, {"_id": 0})
        docs = await cursor.to_list(1000)
        return [Supplier(**doc) for doc in docs]

    async def get_supplier(self, supplier_id: str, venue_id: str) -> Optional[Supplier]:
        doc = await self.col.find_one({"id": supplier_id, "venue_id": venue_id}, {"_id": 0})
        return Supplier(**doc) if doc else None
