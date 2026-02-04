from datetime import datetime, timezone
from typing import List, Optional
from inventory.models import StockLedgerEntry, StockLedgerEntryCreate

class StockLedgerService:
    """Append-only ledger for all stock movements"""
    
    def __init__(self, db):
        self.db = db
        self.col = db.stock_ledger

    async def record_movement(
        self,
        data: StockLedgerEntryCreate,
        actor_id: str,
        request_id: Optional[str] = None
    ) -> StockLedgerEntry:
        entry = StockLedgerEntry(
            venue_id=data.venue_id,
            item_id=data.item_id,
            qty_delta=data.qty_delta,
            unit=data.unit,
            reason=data.reason,
            ref_type=data.ref_type,
            ref_id=data.ref_id,
            actor_user_id=actor_id,
            request_id=request_id
        )
        
        await self.col.insert_one(entry.model_dump())
        return entry

    async def get_current_stock(self, item_id: str, venue_id: str) -> float:
        """Calculate current theoretical stock from ledger"""
        pipeline = [
            {"$match": {"item_id": item_id, "venue_id": venue_id}},
            {"$group": {"_id": None, "total": {"$sum": "$qty_delta"}}}
        ]
        
        result = await self.col.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0.0

    async def get_item_ledger(
        self,
        item_id: str,
        venue_id: str,
        limit: int = 100
    ) -> List[StockLedgerEntry]:
        cursor = self.col.find(
            {"item_id": item_id, "venue_id": venue_id},
            {"_id": 0}
        ).sort("occurred_at", -1).limit(limit)
        
        docs = await cursor.to_list(limit)
        return [StockLedgerEntry(**doc) for doc in docs]
