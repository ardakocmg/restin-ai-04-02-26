"""Delivery Order Service"""
from datetime import datetime, timezone

from core.database import db
from core.events_outbox import Outbox
from integrations_v2.models.delivery_order import DeliveryOrder


class DeliveryOrderService:
    
    async def ingest_delivery_order(self, venue_id: str, connector_key: str, external_order_data: dict):
        """Ingest external delivery order and create internal POS order"""
        
        # Create canonical delivery order
        delivery_order = DeliveryOrder(
            venue_id=venue_id,
            source={
                "connector_key": connector_key,
                "external_order_id": external_order_data.get("id"),
                "external_store_id": external_order_data.get("store_id")
            },
            customer={
                "name_redacted": external_order_data.get("customer", {}).get("name", "")[:10] + "***",
                "phone_redacted": "***" + external_order_data.get("customer", {}).get("phone", "")[-4:]
            },
            items=[],
            totals=external_order_data.get("totals", {}),
            timing=external_order_data.get("timing", {}),
            state="NEW"
        )
        
        # Store delivery order
        await db.delivery_orders.insert_one(delivery_order.model_dump())
        
        # Emit event for processing
        outbox = Outbox(db)
        outbox.emit(venue_id, "integrations.delivery_order.received", f"DELORD:{delivery_order.id}", {
            "delivery_order_id": delivery_order.id,
            "connector_key": connector_key
        })
        
        print(f"📦 DeliveryOrder: Ingested order from {connector_key}")
        
        return delivery_order

delivery_order_service = DeliveryOrderService()
