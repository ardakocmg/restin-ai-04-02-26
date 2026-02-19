"""
Order Anywhere → KDS Integration
Converts online guest orders into KDS-compatible orders and routes them to kitchen stations.
Mirrors the PosKdsIntegration pattern.
"""
from typing import List
from datetime import datetime, timezone
from services.kds_order_integration import KdsOrderIntegration
import logging
import uuid

logger = logging.getLogger(__name__)


class OrderAnywhereKdsIntegration:
    """Bridge between online_orders and KDS ticket system."""

    def __init__(self, db):
        self.db = db
        self.kds_integration = KdsOrderIntegration(db)

    async def send_to_kds(self, online_order_id: str, venue_id: str, actor_id: str = "system") -> List[str]:
        """
        Convert an online order into KDS tickets.
        1. Read from online_orders
        2. Upsert into orders collection (KDS reads from here)
        3. Route items to KDS stations via KdsOrderIntegration
        Returns list of created ticket IDs.
        """
        # 1. Fetch the online order
        online_order = await self.db.online_orders.find_one(
            {"id": online_order_id, "venue_id": venue_id},
            {"_id": 0}
        )
        if not online_order:
            logger.error(f"Online order {online_order_id} not found for KDS injection")
            return []

        # 2. Build KDS-compatible order structure
        kds_order = {
            "id": online_order_id,
            "venue_id": venue_id,
            "table_name": online_order.get("table_name", "Online"),
            "server_name": f"Order Anywhere ({online_order.get('guest_name', 'Guest')})",
            "guest_count": 1,
            "order_type": online_order.get("order_type", "TAKEAWAY").upper(),
            "source": "order_anywhere",
            "items": [],
            "created_at": online_order.get("created_at", datetime.now(timezone.utc).isoformat()),
        }

        # 3. Map items — KDS expects id, menu_item_id, menu_item_name, quantity, modifiers, notes
        for item in online_order.get("items", []):
            kds_order["items"].append({
                "id": item.get("item_id", str(uuid.uuid4())[:8]),
                "menu_item_id": item.get("item_id", ""),
                "menu_item_name": item.get("name", "Unknown"),
                "quantity": item.get("quantity", 1),
                "category": "",
                "modifiers": item.get("modifiers", []),
                "notes": item.get("notes", ""),
            })

        # 4. Upsert into orders collection (KDS reads from this)
        await self.db.orders.update_one(
            {"id": online_order_id, "venue_id": venue_id},
            {"$set": kds_order},
            upsert=True
        )

        # 5. Route to KDS stations
        try:
            ticket_ids = await self.kds_integration.send_order_to_kds(
                online_order_id, venue_id, actor_id
            )
            logger.info(
                f"Online order {online_order_id} sent to KDS: {len(ticket_ids)} ticket(s)"
            )

            # 6. Mark the online order as sent to KDS
            await self.db.online_orders.update_one(
                {"id": online_order_id},
                {"$set": {
                    "kds_sent": True,
                    "kds_ticket_ids": ticket_ids,
                    "kds_sent_at": datetime.now(timezone.utc).isoformat(),
                }}
            )

            return ticket_ids
        except Exception as e:
            logger.error(f"Failed to route online order {online_order_id} to KDS: {e}")
            # Mark as failed but don't block — order still accepted
            await self.db.online_orders.update_one(
                {"id": online_order_id},
                {"$set": {"kds_sent": False, "kds_error": str(e)}}
            )
            return []
