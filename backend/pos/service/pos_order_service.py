from datetime import datetime, timezone
from typing import Optional, List
from pos.models import PosOrder, PosOrderCreate, PosOrderItem, PosOrderItemCreate, OrderTotals

class PosOrderService:
    def __init__(self, db):
        self.db = db
        self.orders_col = db.pos_orders
        self.items_col = db.pos_order_items

    async def create_order(self, data: PosOrderCreate, user_id: str) -> PosOrder:
        order_count = await self.orders_col.count_documents({"venue_id": data.venue_id})
        display_id = f"ORD-{order_count + 1:06d}"
        
        order = PosOrder(
            display_id=display_id,
            venue_id=data.venue_id,
            session_id=data.session_id,
            table_id=data.table_id,
            order_type=data.order_type,
            seats_enabled=data.seats_enabled,
            course_enabled=data.course_enabled,
            created_by=user_id,
            updated_by=user_id
        )
        
        await self.orders_col.insert_one(order.model_dump())
        return order

    async def get_order(self, order_id: str, venue_id: str) -> Optional[PosOrder]:
        doc = await self.orders_col.find_one({"id": order_id, "venue_id": venue_id}, {"_id": 0})
        return PosOrder(**doc) if doc else None

    async def add_item(self, item_data: PosOrderItemCreate, menu_item: dict, user_id: str) -> PosOrderItem:
        # Calculate pricing
        unit_price = menu_item.get("price", 0.0)
        
        # Add modifier costs
        modifier_total = sum(m.price_delta for m in item_data.modifiers)
        unit_price += modifier_total
        
        line_total = unit_price * item_data.qty
        
        from pos.models import ItemPricing
        item = PosOrderItem(
            order_id=item_data.order_id,
            venue_id=item_data.venue_id,
            menu_item_id=item_data.menu_item_id,
            menu_item_name=menu_item.get("name", "Unknown"),
            qty=item_data.qty,
            seat_no=item_data.seat_no,
            course_no=item_data.course_no,
            modifiers=item_data.modifiers,
            instructions=item_data.instructions,
            pricing=ItemPricing(unit_price=unit_price, line_total=line_total),
            created_by=user_id,
            updated_by=user_id
        )
        
        await self.items_col.insert_one(item.model_dump())
        await self._recalculate_order_totals(item_data.order_id, item_data.venue_id)
        return item

    async def fire_item(self, item_id: str, venue_id: str, user_id: str):
        await self.items_col.update_one(
            {"id": item_id, "venue_id": venue_id},
            {"$set": {
                "state": "FIRED",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user_id
            }}
        )

    async def void_item(self, item_id: str, venue_id: str, user_id: str):
        await self.items_col.update_one(
            {"id": item_id, "venue_id": venue_id},
            {"$set": {
                "state": "VOIDED",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user_id
            }}
        )
        
        item = await self.items_col.find_one({"id": item_id}, {"_id": 0})
        if item:
            await self._recalculate_order_totals(item["order_id"], venue_id)

    async def send_order(self, order_id: str, venue_id: str, user_id: str):
        # Mark all HELD/FIRED items as SENT
        await self.items_col.update_many(
            {"order_id": order_id, "venue_id": venue_id, "state": {"$in": ["HELD", "FIRED"]}},
            {"$set": {
                "state": "SENT",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user_id
            }}
        )
        
        await self.orders_col.update_one(
            {"id": order_id, "venue_id": venue_id},
            {"$set": {
                "status": "SENT",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user_id
            }}
        )

    async def close_order(self, order_id: str, venue_id: str, user_id: str):
        await self.orders_col.update_one(
            {"id": order_id, "venue_id": venue_id},
            {"$set": {
                "status": "CLOSED",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user_id
            }}
        )

    async def get_order_items(self, order_id: str, venue_id: str) -> List[PosOrderItem]:
        cursor = self.items_col.find({"order_id": order_id, "venue_id": venue_id}, {"_id": 0})
        docs = await cursor.to_list(1000)
        return [PosOrderItem(**doc) for doc in docs]

    async def _recalculate_order_totals(self, order_id: str, venue_id: str):
        items = await self.get_order_items(order_id, venue_id)
        
        subtotal = sum(item.pricing.line_total for item in items if item.state != "VOIDED")
        tax = subtotal * 0.18  # 18% VAT
        grand_total = subtotal + tax
        
        await self.orders_col.update_one(
            {"id": order_id, "venue_id": venue_id},
            {"$set": {
                "totals": OrderTotals(
                    subtotal=subtotal,
                    tax=tax,
                    grand_total=grand_total
                ).model_dump(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
