"""Stock Adjustment Service"""
from datetime import datetime, timezone

from core.database import db
from core.errors import bad_request, forbidden
from core.venue_config import VenueConfigRepo
from core.events_outbox import Outbox
from models.stock_adjustment import StockAdjustment
from core.uns import IDService


class StockAdjustmentService:
    
    async def lock_adjustment(self, adjustment_id: str, locked_by: str):
        """Lock adjustment and post to ledger"""
        adj = await db.stock_adjustments.find_one({"id": adjustment_id}, {"_id": 0})
        if not adj:
            raise bad_request("Adjustment not found")
        
        venue_id = adj["venue_id"]
        
        # Check venue rules
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        
        if cfg.get("rules", {}).get("stock_adjustment_requires_approval") and adj["status"] != "APPROVED":
            raise forbidden("Approval required before lock")
        
        # Write ledger movements for each line
        from models import LedgerAction, StockLedgerEntry
        from utils.helpers import compute_hash
        
        for line in adj["lines"]:
            # Determine action
            if line["qty_delta_base"] > 0:
                action = LedgerAction.IN
                qty = line["qty_delta_base"]
            else:
                action = LedgerAction.OUT
                qty = abs(line["qty_delta_base"])
            
            # Get last entry hash
            last_entry = await db.stock_ledger.find_one(
                {"venue_id": venue_id},
                sort=[("created_at", -1)],
                projection={"_id": 0, "entry_hash": 1}
            )
            prev_hash = last_entry["entry_hash"] if last_entry else "genesis"
            
            entry_data = {
                "item_id": line["sku_id"],
                "action": action,
                "quantity": qty,
                "source": "ADJ",
                "source_id": adjustment_id
            }
            entry_hash = compute_hash(entry_data, prev_hash)
            
            idempotency_key = f"ADJ:{adjustment_id}:{line['sku_id']}"
            
            # Check idempotency
            existing = await db.idempotency_keys.find_one({"key": idempotency_key})
            if existing:
                continue  # Already posted
            
            entry = StockLedgerEntry(
                venue_id=venue_id,
                item_id=line["sku_id"],
                action=action,
                quantity=qty,
                lot_number=line.get("lot_no"),
                expiry_date=line.get("expiry_at"),
                reason=f"Adjustment {adj['display_id']}: {adj['reason_code']}",
                user_id=locked_by,
                prev_hash=prev_hash,
                entry_hash=entry_hash
            )
            
            await db.stock_ledger.insert_one(entry.model_dump())
            await db.idempotency_keys.insert_one({"venue_id": venue_id, "key": idempotency_key})
            
            # Update stock
            delta = line["qty_delta_base"]
            await db.inventory_items.update_one(
                {"id": line["sku_id"]},
                {"$inc": {"quantity": delta}}
            )
        
        # Mark as locked
        await db.stock_adjustments.update_one(
            {"id": adjustment_id},
            {"$set": {
                "status": "LOCKED",
                "locked_by": locked_by,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Emit event
        outbox = Outbox(db)
        outbox.emit(venue_id, "inventory.adjustment.locked", f"ADJ:{adjustment_id}", {
            "adjustment_id": adjustment_id,
            "venue_id": venue_id
        })
        
        return {"ok": True, "message": "Adjustment locked"}


stock_adjustment_service = StockAdjustmentService()
