from datetime import datetime, timezone
from typing import List, Optional
from inventory.models import PurchaseOrder, PurchaseOrderCreate

class PurchasingService:
    def __init__(self, db):
        self.db = db
        self.col = db.purchase_orders

    async def create_po(self, data: PurchaseOrderCreate, user_id: str) -> PurchaseOrder:
        po_count = await self.col.count_documents({"venue_id": data.venue_id})
        display_id = f"PO-{po_count + 1:06d}"
        
        supplier = await self.db.suppliers.find_one({"id": data.supplier_id}, {"_id": 0})
        
        subtotal = sum(line.line_total for line in data.lines)
        tax = subtotal * 0.18
        
        po = PurchaseOrder(
            display_id=display_id,
            venue_id=data.venue_id,
            supplier_id=data.supplier_id,
            supplier_name=supplier["name"] if supplier else "Unknown",
            lines=data.lines,
            subtotal=subtotal,
            tax=tax,
            total=subtotal + tax,
            created_by=user_id
        )
        
        await self.col.insert_one(po.model_dump())
        return po

    async def approve_po(self, po_id: str, venue_id: str, user_id: str):
        await self.col.update_one(
            {"id": po_id, "venue_id": venue_id},
            {"$set": {
                "status": "APPROVED",
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": user_id
            }}
        )

    async def receive_po(self, po_id: str, venue_id: str, user_id: str):
        """Mark PO as received and create stock ledger entries"""
        po = await self.col.find_one({"id": po_id, "venue_id": venue_id}, {"_id": 0})
        if not po:
            return
        
        from inventory.services.stock_ledger_service import StockLedgerService
        from inventory.models import StockLedgerEntryCreate
        
        ledger_service = StockLedgerService(self.db)
        
        for line in po["lines"]:
            await ledger_service.record_movement(
                StockLedgerEntryCreate(
                    venue_id=venue_id,
                    item_id=line["item_id"],
                    qty_delta=line["qty"],
                    unit=line["unit"],
                    reason="PURCHASE_RECEIPT",
                    ref_type="PO",
                    ref_id=po_id
                ),
                actor_id=user_id
            )
        
        await self.col.update_one(
            {"id": po_id, "venue_id": venue_id},
            {"$set": {"status": "RECEIVED"}}
        )

    async def list_pos(self, venue_id: str, status: Optional[str] = None) -> List[PurchaseOrder]:
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        cursor = self.col.find(query, {"_id": 0}).sort("created_at", -1)
        docs = await cursor.to_list(1000)
        return [PurchaseOrder(**doc) for doc in docs]
