import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
from services.reconciliation_service import ReconciliationService

async def main():
    db_client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = db_client['restin_v2']
    
    # 1. Create a dummy stuck order from 20 mins ago
    stale_time = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()
    dummy_order = {
        "id": "order-stale-test-123",
        "venue_id": "venue-caviar-bull",
        "status": "PENDING_PAYMENT",
        "created_at": stale_time
    }
    await db.pos_orders.insert_one(dummy_order)
    print("Inserted dummy PENDING_PAYMENT order")
    
    # 2. Run reconciliation
    recon_service = ReconciliationService(db)
    count = await recon_service.reconcile_stale_payments()
    print(f"Reconciled {count} order(s)")
    
    # 3. Verify it was cancelled
    check = await db.pos_orders.find_one({"id": "order-stale-test-123"})
    print("Final status:", check.get("status"))
    
    # Cleanup
    await db.pos_orders.delete_one({"id": "order-stale-test-123"})

asyncio.run(main())
