from typing import List, Optional
from datetime import datetime
from .models import Order, OrderCreate, OrderItem

# In-Memory Queue (Replace with Redis/DB in Production)
MOCK_ORDER_DB: List[Order] = []

class PosService:
    @staticmethod
    def create_order(order_data: OrderCreate) -> Order:
        total = sum(i.quantity * i.price_cents for i in order_data.items)
        new_order = Order(
            id=f"ord-{len(MOCK_ORDER_DB) + 1}",
            venueId=order_data.venue_id,
            tableId=order_data.table_id,
            userId=order_data.user_id,
            status="PENDING",
            totalCents=total,
            items=order_data.items,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        MOCK_ORDER_DB.append(new_order)
        return new_order

    @staticmethod
    def get_active_orders(venue_id: str) -> List[Order]:
        return [o for o in MOCK_ORDER_DB if o.venue_id == venue_id and o.status != 'COMPLETED']

    @staticmethod
    def update_status(order_id: str, status: str) -> Optional[Order]:
        order = next((o for o in MOCK_ORDER_DB if o.id == order_id), None)
        if order:
            order.status = status
            order.updated_at = datetime.now()
        return order
