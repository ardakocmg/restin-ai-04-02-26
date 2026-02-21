import asyncio
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

class ReconciliationService:
    def __init__(self, db):
        self.db = db

    async def reconcile_stale_payments(self):
        """
        Looks for orders stuck in 'PENDING_PAYMENT' for more than 15 minutes
        and moves them to 'CANCELLED' or 'FAILED' to free up inventory / tables.
        """
        logger.info("[ReconciliationService] Running stale payment check...")
        try:
            now = datetime.now(timezone.utc)
            stale_threshold = now - timedelta(minutes=15)
            
            # Find orders that are pending payment and older than threshold
            query = {
                "status": "PENDING_PAYMENT",
                "created_at": {"$lt": stale_threshold.isoformat()}
            }
            
            stale_orders = await self.db.pos_orders.find(query).to_list(100)
            
            if not stale_orders:
                logger.info("[ReconciliationService] No stale payments found.")
                return 0
                
            count = 0
            for order in stale_orders:
                order_id = order["id"]
                venue_id = order.get("venue_id", "unknown")
                
                # Close the order as failed/cancelled
                await self.db.pos_orders.update_one(
                    {"id": order_id},
                    {"$set": {
                        "status": "CANCELLED",
                        "updated_at": now.isoformat(),
                        "reconciliation_note": "Auto-cancelled due to payment timeout"
                    }}
                )
                
                # Log to audit trail
                from services.audit_service import create_audit_log
                await create_audit_log(
                    venue_id=venue_id,
                    user_id="system",
                    user_name="System",
                    action="auto_cancel",
                    resource_type="order",
                    resource_id=order_id,
                    details={"reason": "Stale pending payment exceeding 15 minutes"}
                )
                count += 1
                
            logger.warning(f"[ReconciliationService] Reconciled and cancelled {count} stale orders.")
            return count
            
        except Exception as e:
            logger.error(f"[ReconciliationService] Error during reconciliation: {e}")
            return 0
