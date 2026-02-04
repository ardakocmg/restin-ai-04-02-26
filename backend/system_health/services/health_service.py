"""Health Service"""
from datetime import datetime, timezone

from core.database import db


class HealthService:
    
    async def get_health_snapshot(self, venue_id: str):
        """Compute current health snapshot"""
        
        # Hard checks
        hard = {
            "db": "OK",  # If we got here, DB is reachable
            "auth": "OK",
            "outbox": await self._check_outbox_consumer(),
            "reporting": "OK"
        }
        
        # Soft metrics
        outbox_lag = await db.event_outbox.count_documents({"consumed_at": None})
        dlq_count = await db.event_dlq.count_documents({})
        
        soft = {
            "outbox_lag": {
                "value": outbox_lag,
                "status": "CRIT" if outbox_lag > 100 else "WARN" if outbox_lag > 25 else "OK"
            },
            "dlq_count": {
                "value": dlq_count,
                "status": "CRIT" if dlq_count > 10 else "WARN" if dlq_count > 1 else "OK"
            },
            "api_p95_ms": {"value": 0, "status": "OK"},  # Placeholder
            "error_rate_pct": {"value": 0, "status": "OK"},
            "ws_reconnect_per_min": {"value": 0, "status": "OK"}
        }
        
        # Overall status
        has_crit = any(v.get("status") == "CRIT" for v in soft.values())
        has_warn = any(v.get("status") == "WARN" for v in soft.values())
        has_fail = any(v == "FAIL" for v in hard.values())
        
        if has_fail or has_crit:
            overall = "DOWN"
        elif has_warn:
            overall = "DEGRADED"
        else:
            overall = "OK"
        
        return {
            "overall": overall,
            "hard": hard,
            "soft": soft,
            "last_updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _check_outbox_consumer(self) -> str:
        """Check if outbox consumer is running"""
        # Check last heartbeat
        heartbeat = await db.job_heartbeats.find_one({"job_key": "outbox_consumer"})
        
        if not heartbeat:
            return "FAIL"
        
        # Check if stale (older than 120 seconds)
        from datetime import datetime, timezone
        last = datetime.fromisoformat(heartbeat.get("last_heartbeat_at", ""))
        now = datetime.now(timezone.utc)
        diff = (now - last).total_seconds()
        
        if diff > 120:
            return "FAIL"
        
        return "OK"

health_service = HealthService()
