"""Data Volume Monitor Service"""
from datetime import datetime, timezone

from core.database import db


class DataVolumeMonitor:
    
    async def capture_snapshot(self, venue_id: str):
        """Capture data volume snapshot for all collections"""
        
        collections = [
            "inventory_items", "orders", "stock_ledger",
            "outbox_events", "audit_log", "guests"
        ]
        
        for collection in collections:
            count = await db[collection].count_documents({"venue_id": venue_id})
            
            # Storage size (approximate)
            storage_mb = count * 0.001  # Rough estimate
            
            await db.data_volume_snapshots.insert_one({
                "venue_id": venue_id,
                "collection": collection,
                "doc_count": count,
                "storage_mb": storage_mb,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

data_volume_monitor = DataVolumeMonitor()
