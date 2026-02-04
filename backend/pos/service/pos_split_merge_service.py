from datetime import datetime, timezone
from typing import List, Optional
from pos.models import PosOrder, PosOrderItem

class PosSplitMergeService:
    """Handle table operations: split, merge, transfer"""
    
    def __init__(self, db):
        self.db = db
        self.orders_col = db.pos_orders
        self.items_col = db.pos_order_items

    async def split_order(
        self,
        source_order_id: str,
        item_ids_to_move: List[str],
        new_table_id: str,
        venue_id: str,
        user_id: str
    ) -> PosOrder:
        """Split items from one order to a new order"""
        source_order = await self.orders_col.find_one({"id": source_order_id, "venue_id": venue_id}, {"_id": 0})
        if not source_order:
            raise ValueError("Source order not found")
        
        # Create new order
        order_count = await self.orders_col.count_documents({"venue_id": venue_id})
        new_order = PosOrder(
            display_id=f"ORD-{order_count + 1:06d}",
            venue_id=venue_id,
            session_id=source_order["session_id"],
            table_id=new_table_id,
            order_type=source_order["order_type"],
            seats_enabled=source_order["seats_enabled"],
            course_enabled=source_order["course_enabled"],
            created_by=user_id,
            updated_by=user_id
        )
        
        await self.orders_col.insert_one(new_order.model_dump())
        
        # Move items
        await self.items_col.update_many(
            {"id": {"$in": item_ids_to_move}, "venue_id": venue_id},
            {"$set": {
                "order_id": new_order.id,
                "updated_by": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Recalculate both orders
        from pos.service.pos_order_service import PosOrderService
        order_service = PosOrderService(self.db)
        await order_service._recalculate_order_totals(source_order_id, venue_id)
        await order_service._recalculate_order_totals(new_order.id, venue_id)
        
        return new_order

    async def merge_orders(
        self,
        source_order_ids: List[str],
        target_order_id: str,
        venue_id: str,
        user_id: str
    ):
        """Merge multiple orders into one"""
        # Move all items to target order
        await self.items_col.update_many(
            {"order_id": {"$in": source_order_ids}, "venue_id": venue_id},
            {"$set": {
                "order_id": target_order_id,
                "updated_by": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Cancel source orders
        await self.orders_col.update_many(
            {"id": {"$in": source_order_ids}, "venue_id": venue_id},
            {"$set": {
                "status": "CANCELLED",
                "updated_by": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Recalculate target
        from pos.service.pos_order_service import PosOrderService
        order_service = PosOrderService(self.db)
        await order_service._recalculate_order_totals(target_order_id, venue_id)

    async def transfer_order(
        self,
        order_id: str,
        new_table_id: str,
        venue_id: str,
        user_id: str
    ):
        """Transfer order to different table"""
        await self.orders_col.update_one(
            {"id": order_id, "venue_id": venue_id},
            {"$set": {
                "table_id": new_table_id,
                "updated_by": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
