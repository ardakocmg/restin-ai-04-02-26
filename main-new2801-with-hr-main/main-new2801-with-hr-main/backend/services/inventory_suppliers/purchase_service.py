"""Purchase Service - PO lifecycle management"""
from datetime import datetime, timezone

from core.database import db
from models.purchase_order import PurchaseOrder, POLine
from services.id_service import ensure_ids
from services.event_bus import event_bus


class PurchaseService:
    
    async def create_po(self, data: dict, venue_id: str, created_by: str):
        """Create a new purchase order"""
        supplier = await db.suppliers.find_one({"id": data["supplier_id"]}, {"_id": 0})
        if not supplier:
            return False, {"error": "Supplier not found"}
        
        # Build lines with pricing
        lines = []
        subtotal = 0.0
        
        for line_data in data.get("lines", []):
            sku = await db.inventory_items.find_one({"id": line_data["sku_id"]}, {"_id": 0})
            if not sku:
                continue
            
            line = POLine(
                sku_id=line_data["sku_id"],
                sku_name=sku["name"],
                supplier_sku=line_data.get("supplier_sku", ""),
                qty_ordered=line_data["qty_ordered"],
                qty_received=0.0,
                uom=line_data.get("uom", sku["unit"]),
                unit_price=line_data.get("unit_price", 0.0),
                line_total=line_data["qty_ordered"] * line_data.get("unit_price", 0.0)
            )
            lines.append(line)
            subtotal += line.line_total
        
        vat_amount = subtotal * 0.18  # Malta VAT 18%
        total = subtotal + vat_amount
        
        po = PurchaseOrder(
            venue_id=venue_id,
            supplier_id=data["supplier_id"],
            supplier_name=supplier["name"],
            lines=lines,
            subtotal=subtotal,
            vat_amount=vat_amount,
            total_amount=total,
            expected_delivery_date=data.get("expected_delivery_date"),
            notes=data.get("notes"),
            created_by=created_by
        )
        
        po_dict = po.model_dump()
        po_dict = await ensure_ids(db, "PO", po_dict, venue_id)
        
        await db.purchase_orders.insert_one(po_dict)
        
        # Remove MongoDB _id before returning
        po_dict.pop('_id', None)
        
        return True, po_dict
    
    async def submit_po(self, po_id: str):
        """Submit PO for approval"""
        await db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {"status": "SUBMITTED", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        await event_bus.publish("inventory.po.submitted", {"po_id": po_id})
        return {"message": "PO submitted"}
    
    async def approve_po(self, po_id: str, approved_by: str):
        """Approve PO"""
        await db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {
                "status": "APPROVED",
                "approved_by": approved_by,
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await event_bus.publish("inventory.po.approved", {"po_id": po_id, "approved_by": approved_by})
        return {"message": "PO approved"}
    
    async def send_po(self, po_id: str):
        """Mark PO as sent to supplier"""
        await db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {
                "status": "SENT",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "PO sent to supplier"}
    
    async def cancel_po(self, po_id: str, reason: str):
        """Cancel PO"""
        await db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {
                "status": "CANCELLED",
                "cancel_reason": reason,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "PO cancelled"}


purchase_service = PurchaseService()
