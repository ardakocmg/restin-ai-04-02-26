from datetime import datetime, timezone
from typing import List
from inventory.models.stock_count import StockCount, StockCountLine, WasteEntry
from inventory.services.stock_ledger_service import StockLedgerService
from inventory.models import StockLedgerEntryCreate

class StockCountService:
    def __init__(self, db):
        self.db = db
        self.col = db.stock_counts
        self.ledger_service = StockLedgerService(db)

    async def start_count(self, venue_id: str, user_id: str) -> StockCount:
        count_num = await self.col.count_documents({"venue_id": venue_id})
        display_id = f"SC-{count_num + 1:06d}"
        
        count = StockCount(
            display_id=display_id,
            venue_id=venue_id,
            status="IN_PROGRESS",
            started_at=datetime.now(timezone.utc).isoformat(),
            created_by=user_id
        )
        
        await self.col.insert_one(count.model_dump())
        return count

    async def submit_count_line(self, count_id: str, line: StockCountLine, venue_id: str):
        # Get theoretical stock
        theoretical = await self.ledger_service.get_current_stock(line.item_id, venue_id)
        line.theoretical_qty = theoretical
        line.variance = line.counted_qty - theoretical
        
        await self.col.update_one(
            {"id": count_id, "venue_id": venue_id},
            {"$push": {"lines": line.model_dump()}}
        )

    async def complete_count(self, count_id: str, venue_id: str, user_id: str):
        count = await self.col.find_one({"id": count_id, "venue_id": venue_id}, {"_id": 0})
        if not count:
            return
        
        # Create ledger adjustments for variances (skip if variance is 0)
        for line in count.get("lines", []):
            if line.get("variance", 0) != 0:
                await self.ledger_service.record_movement(
                    StockLedgerEntryCreate(
                        venue_id=venue_id,
                        item_id=line["item_id"],
                        qty_delta=line["variance"],
                        unit=line["unit"],
                        reason="STOCK_ADJUSTMENT",
                        ref_type="COUNT",
                        ref_id=count_id
                    ),
                    actor_id=user_id
                )
        
        await self.col.update_one(
            {"id": count_id, "venue_id": venue_id},
            {"$set": {
                "status": "COMPLETED",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )

class WasteService:
    def __init__(self, db):
        self.db = db
        self.col = db.waste_entries
        self.ledger_service = StockLedgerService(db)

    async def log_waste(self, waste: WasteEntry, user_id: str) -> WasteEntry:
        await self.col.insert_one(waste.model_dump())
        
        # Create negative ledger entry
        await self.ledger_service.record_movement(
            StockLedgerEntryCreate(
                venue_id=waste.venue_id,
                item_id=waste.item_id,
                qty_delta=-waste.qty,
                unit=waste.unit,
                reason="WASTE",
                ref_type="WASTE",
                ref_id=waste.id
            ),
            actor_id=user_id
        )
        
        return waste

    async def list_waste(self, venue_id: str, limit: int = 100) -> List[WasteEntry]:
        cursor = self.col.find({"venue_id": venue_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(limit)
        return [WasteEntry(**doc) for doc in docs]
