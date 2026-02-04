"""Performance Monitoring Service"""
import time
from functools import wraps
from datetime import datetime, timezone

from core.database import db


def track_performance(service_name: str, operation: str):
    """Decorator to track query performance"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.time()
            result = await func(*args, **kwargs)
            duration_ms = (time.time() - start) * 1000
            
            # Log if slow (>800ms)
            if duration_ms > 800:
                await db.slow_query_logs.insert_one({
                    "venue_id": kwargs.get("venue_id", "unknown"),
                    "service_name": service_name,
                    "operation": operation,
                    "duration_ms": duration_ms,
                    "filters_hash": str(hash(str(kwargs))),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            return result
        return wrapper
    return decorator
