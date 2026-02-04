"""Receiving Service - GRN processing"""
from datetime import datetime, timezone

from core.database import db
from models.receiving_grn import ReceivingGRN, GRNLine
from services.id_service import ensure_ids
from services.event_bus import event_bus


class ReceivingService:
    
    async def create_grn(self, data: dict, created_by: str):
        """Create a Goods Received Note"""
        supplier = await db.suppliers.find_one({"id": data["supplier_id"]}, {"_id": 0})
        if not supplier:
            return False, {"error": "Supplier not found"}
        
        # Get PO if provided
        po = None
        if data.get("po_id"):
            po = await db.purchase_orders.find_one({"id": data["po_id"]}, {"_id": 0})
        
        # Build GRN lines
        lines = []
        for line_data in data.get("lines", []):
            sku = await db.inventory_items.find_one({"id": line_data["sku_id"]}, {"_id": 0})
            if not sku:
                continue
            
            line = GRNLine(
                sku_id=line_data["sku_id"],
                sku_name=sku["name"],
                qty_received=line_data["qty_received"],
                base_uom=sku.get("unit", "EA"),
                lot_number=line_data.get("lot_number"),
                expiry_date=line_data.get("expiry_date"),
                po_line_id=line_data.get("po_line_id")
            )
            lines.append(line)
        
        grn = ReceivingGRN(
            venue_id=data["venue_id"],
            supplier_id=data["supplier_id"],
            supplier_name=supplier["name"],
            po_id=data.get("po_id"),
            po_display_id=po.get("display_id") if po else None,
            lines=lines,
            notes=data.get("notes"),
            created_by=created_by
        )
        
        grn_dict = grn.model_dump()
        grn_dict = await ensure_ids(db, "GRN", grn_dict, data["venue_id"])
        
        await db.receiving_grns.insert_one(grn_dict)
        
        return True, grn_dict
    
    async def post_grn(self, grn_id: str):
        """Post GRN to ledger (idempotent)"""
        grn = await db.receiving_grns.find_one({"id": grn_id}, {"_id": 0})
        if not grn:
            return False, {"error": "GRN not found"}
        
        if grn.get("posted_at"):
            return True, {"message": "Already posted", "idempotent": True}
        
        # Write to stock ledger
        for line in grn["lines"]:
            from models import LedgerAction, StockLedgerEntry
            from utils.helpers import compute_hash
            
            # Get last entry hash
            last_entry = await db.stock_ledger.find_one(
                {"venue_id": grn["venue_id"]},
                sort=[("created_at", -1)],
                projection={"_id": 0, "entry_hash": 1}
            )
            prev_hash = last_entry["entry_hash"] if last_entry else "genesis"
            
            entry_data = {
                "item_id": line["sku_id"],
                "action": "IN",
                "quantity": line["qty_received"],
                "source": "GRN",
                "source_id": grn_id
            }
            entry_hash = compute_hash(entry_data, prev_hash)
            
            entry = StockLedgerEntry(
                venue_id=grn["venue_id"],
                item_id=line["sku_id"],
                action=LedgerAction.IN,
                quantity=line["qty_received"],
                lot_number=line.get("lot_number"),
                expiry_date=line.get("expiry_date"),
                reason=f"GRN: {grn['display_id']}",
                user_id=grn["created_by"],
                prev_hash=prev_hash,
                entry_hash=entry_hash
            )
            
            await db.stock_ledger.insert_one(entry.model_dump())
            
            # Update current stock
            await db.inventory_items.update_one(
                {"id": line["sku_id"]},
                {"$inc": {"quantity": line["qty_received"]}}
            )
        
        # Mark GRN as posted
        await db.receiving_grns.update_one(
            {"id": grn_id},
            {"$set": {"posted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Update PO received quantities if linked
        if grn.get("po_id"):
            await self._update_po_received_qty(grn["po_id"], grn["lines"])
        
        # Publish event
        await event_bus.publish("inventory.grn.posted", {
            "grn_id": grn_id,
            "venue_id": grn["venue_id"],
            "supplier_id": grn["supplier_id"]
        })
        
        return True, {"message": "GRN posted to ledger"}
    
    async def _update_po_received_qty(self, po_id: str, grn_lines: list):
        """Update PO received quantities"""
        po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
        if not po:
            return
        
        lines = po["lines"]
        for grn_line in grn_lines:
            for po_line in lines:
                if po_line["sku_id"] == grn_line["sku_id"]:
                    po_line["qty_received"] += grn_line["qty_received"]
        
        # Check if fully received
        all_received = all(l["qty_received"] >= l["qty_ordered"] for l in lines)
        status = "RECEIVED_CLOSED" if all_received else "PARTIAL_RECEIVED"
        
        await db.purchase_orders.update_one(
            {"id": po_id},
            {"$set": {
                "lines": lines,
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )


receiving_service = ReceivingService()
