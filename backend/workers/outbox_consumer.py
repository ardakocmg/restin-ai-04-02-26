"""Outbox Consumer - Process events and build read models"""
import asyncio
from datetime import datetime, timezone

from core.database import db


class OutboxConsumer:
    
    async def tick(self):
        """Process unconsumed outbox events"""
        events = await db.event_outbox.find(
            {"consumed_at": None},
            {"_id": 0}
        ).limit(10).to_list(10)
        
        for event in events:
            try:
                await self._process_event(event)
                
                # Mark consumed
                await db.event_outbox.update_one(
                    {"topic": event["topic"], "key": event["key"]},
                    {"$set": {"consumed_at": datetime.now(timezone.utc).isoformat()}}
                )
                
            except Exception as e:
                print(f"⚠️ Outbox consumer error: {e}")
                # Store error for retry
                await db.event_outbox.update_one(
                    {"topic": event["topic"], "key": event["key"]},
                    {"$set": {"last_error": str(e)}}
                )
    
    async def _process_event(self, event: dict):
        """Process single event - build read models"""
        topic = event["topic"]
        payload = event["payload"]
        
        # Route to appropriate read model builder
        if topic.startswith("inventory."):
            await self._build_inventory_read_models(topic, payload)
        elif topic.startswith("accounting."):
            await self._build_accounting_read_models(topic, payload)
        elif topic.startswith("analytics."):
            await self._build_analytics_read_models(topic, payload)
        
        print(f"✅ Outbox: Processed {topic}")
    
    async def _build_inventory_read_models(self, topic: str, payload: dict):
        """Build inventory read models"""
        venue_id = payload.get("venue_id")
        
        if topic == "inventory.ledger.movement.created":
            # Rebuild stock on hand
            sku_id = payload.get("sku_id")
            balance = await self._compute_stock_balance(venue_id, sku_id)
            
            await db.rm_stock_on_hand.update_one(
                {"venue_id": venue_id, "sku_id": sku_id},
                {"$set": {"balance": balance, "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )
    
    async def _compute_stock_balance(self, venue_id: str, sku_id: str) -> float:
        """Compute stock balance from ledger"""
        entries = await db.stock_ledger.find(
            {"venue_id": venue_id, "item_id": sku_id},
            {"_id": 0}
        ).to_list(10000)
        
        balance = 0.0
        for entry in entries:
            if entry["action"] == "IN":
                balance += entry["quantity"]
            elif entry["action"] == "OUT":
                balance -= entry["quantity"]
            elif entry["action"] == "ADJUST":
                balance = entry["quantity"]
        
        return balance
    
    async def _build_accounting_read_models(self, topic: str, payload: dict):
        """Build accounting read models"""
        # Trial balance, P&L builders
        pass
    
    async def _build_analytics_read_models(self, topic: str, payload: dict):
        """Build analytics read models"""
        # KPI snapshot builders
        pass


outbox_consumer = OutboxConsumer()


# Background task
async def run_outbox_consumer():
    print("[WORKER] Starting outbox consumer loop...")
    while True:
        try:
            # Diagnostic: Write to local file to verify thread is alive
            with open("worker_heartbeat.log", "a") as f:
                f.write(f"{datetime.now(timezone.utc).isoformat()} - Heartbeat active\n")
            
            # Root level diagnostic
            with open("../worker_health_check.txt", "w") as f:
                f.write(f"LAST_HEARTBEAT: {datetime.now(timezone.utc).isoformat()}")
            
            await outbox_consumer.tick()
            
            # Update heartbeat in DB
            res = await db.job_heartbeats.update_one(
                {"job_key": "outbox_consumer"},
                {"$set": {
                    "last_heartbeat_at": datetime.now(timezone.utc).isoformat(),
                    "status": "OK"
                }},
                upsert=True
            )
            
            await asyncio.sleep(5) # Throttled for visibility
        except Exception as e:
            print(f"❌ [WORKER] Outbox consumer loop error: {e}")
            with open("worker_heartbeat.log", "a") as f:
                f.write(f"{datetime.now(timezone.utc).isoformat()} - ERROR: {e}\n")
            await asyncio.sleep(10)
