"""Suppliers Service - Supplier CRUD operations"""
from datetime import datetime, timezone

from core.database import db
from models.supplier import Supplier
from services.id_service import ensure_ids
from services.event_bus import event_bus


class SuppliersService:
    
    async def create_supplier(self, data: dict, venue_id: str, created_by: str):
        """Create a new supplier"""
        supplier = Supplier(**data)
        supplier_dict = supplier.model_dump()
        
        # Generate display ID
        supplier_dict = await ensure_ids(db, "SUPPLIER", supplier_dict, venue_id)
        
        await db.suppliers.insert_one(supplier_dict)
        
        # Remove MongoDB _id before returning
        supplier_dict.pop('_id', None)
        
        # Publish event
        await event_bus.publish("inventory.supplier.created", {
            "supplier_id": supplier_dict["id"],
            "venue_id": venue_id,
            "name": supplier_dict["name"]
        })
        
        return supplier_dict
    
    async def update_supplier(self, supplier_id: str, data: dict):
        """Update supplier"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.suppliers.update_one(
            {"id": supplier_id},
            {"$set": data}
        )
        
        return {"message": "Supplier updated"}
    
    async def archive_supplier(self, supplier_id: str):
        """Archive (soft delete) supplier"""
        await db.suppliers.update_one(
            {"id": supplier_id},
            {"$set": {
                "is_active": False,
                "archived_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Supplier archived"}
    
    async def list_suppliers(self, venue_id: str, include_archived: bool = False):
        """List suppliers for a venue (including shared suppliers)"""
        query = {"$or": [
            {"venue_id": venue_id},
            {"venues": venue_id},
        ]}
        if not include_archived:
            query["is_active"] = {"$ne": False}
        
        suppliers = await db.suppliers.find(query, {"_id": 0}).sort("name", 1).to_list(500)
        return suppliers


suppliers_service = SuppliersService()
