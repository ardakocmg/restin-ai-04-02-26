"""Test helper routes for KDS development"""
from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
from core.database import db
from core.dependencies import get_current_user
from services.kds_order_integration import KdsOrderIntegration

def create_kds_test_router():
    router = APIRouter(prefix="/kds/test", tags=["kds-test"])
    kds_integration = KdsOrderIntegration(db)

    class TestOrderRequest(BaseModel):
        venue_id: str
        table_name: str = "Table 5"
        items: List[dict] = [
            {"menu_item_name": "Grilled Steak", "quantity": 2, "category": "Steaks"},
            {"menu_item_name": "Caesar Salad", "quantity": 1, "category": "Salads"},
            {"menu_item_name": "Fries", "quantity": 2, "category": "Sides"}
        ]

    @router.post("/create-test-order")
    async def create_test_order(
        request: TestOrderRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a test order and route it to KDS"""
        order_id = str(uuid.uuid4())
        items = []
        
        for item_data in request.items:
            items.append({
                "id": str(uuid.uuid4()),
                "menu_item_id": str(uuid.uuid4()),
                "menu_item_name": item_data["menu_item_name"],
                "quantity": item_data.get("quantity", 1),
                "category": item_data.get("category", ""),
                "price": 10.00,
                "modifiers": item_data.get("modifiers", []),
                "notes": item_data.get("notes"),
                "status": "pending"
            })
        
        order = {
            "id": order_id,
            "venue_id": request.venue_id,
            "table_id": str(uuid.uuid4()),
            "table_name": request.table_name,
            "server_id": current_user["id"],
            "server_name": current_user.get("name", "Test Server"),
            "items": items,
            "status": "OPEN",
            "subtotal": sum(item["price"] * item["quantity"] for item in items),
            "total": sum(item["price"] * item["quantity"] for item in items),
            "guest_count": 2,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.insert_one(order)
        
        ticket_ids = await kds_integration.send_order_to_kds(
            order_id,
            request.venue_id,
            current_user["id"]
        )
        
        return {
            "ok": True,
            "order_id": order_id,
            "ticket_ids": ticket_ids,
            "message": f"Order created and routed to {len(ticket_ids)} stations"
        }

    return router
