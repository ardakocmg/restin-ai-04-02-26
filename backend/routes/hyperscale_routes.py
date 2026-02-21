"""
Hyperscale Metrics Routes — /api/system/hyperscale-metrics

Provides real APM data for the Mission Control dashboard.
Aggregates: MetricsCollector + DLQ stats + MongoDB health + EventBus status.
"""

from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from core.database import get_database
from core.metrics_collector import metrics
from services.observability_service import get_observability_service
import logging
import time

logger = logging.getLogger("hyperscale_routes")

router = APIRouter(prefix="/system", tags=["hyperscale"])


@router.get("/hyperscale-metrics")
async def get_hyperscale_metrics(current_user: dict = Depends(get_current_user)):
    """
    Returns real-time system metrics for the Hyperscale Dashboard.
    Combines in-memory metrics with database-sourced stats.
    """
    db = get_database()
    
    # 1. In-memory metrics (latency, RPS, errors, process info)
    snapshot = metrics.get_snapshot()
    
    # 2. DLQ / Error Inbox stats from MongoDB
    dlq_stats = {"dlq_size": 0, "unresolved_system_errors": 0, "status": "HEALTHY"}
    try:
        obs = get_observability_service(db)
        if obs:
            dlq_stats = await obs.get_dlq_stats()
    except Exception as e:
        logger.warning("Failed to fetch DLQ stats: %s", e)
    
    # 3. EventBus outbox health
    pending_events = 0
    try:
        pending_events = await db.event_outbox.count_documents({"status": "PENDING"})
    except Exception as e:
        logger.warning("Failed to count pending events: %s", e)
    
    # 4. MongoDB connection health
    db_ok = False
    db_latency_ms = 0
    try:
        start = time.monotonic()
        await db.command("ping")
        db_latency_ms = round((time.monotonic() - start) * 1000, 1)
        db_ok = True
    except Exception:
        pass
    
    # 5. Collection stats (active data volume)
    collection_stats = {}
    try:
        for coll_name in ["orders", "inventory_items", "employees", "guests", "venues"]:
            count = await db[coll_name].estimated_document_count()
            collection_stats[coll_name] = count
    except Exception as e:
        logger.warning("Failed to fetch collection stats: %s", e)
    
    # 6. Compose response
    snapshot.update({
        # DLQ
        "dlq_size": dlq_stats.get("dlq_size", 0),
        "unresolved_errors": dlq_stats.get("unresolved_system_errors", 0),
        "dlq_status": dlq_stats.get("status", "UNKNOWN"),
        
        # EventBus
        "pending_events": pending_events,
        "event_bus_status": "HEALTHY" if pending_events < 10 else "WARNING" if pending_events < 100 else "CRITICAL",
        
        # Database
        "db_connection_ok": db_ok,
        "db_latency_ms": db_latency_ms,
        
        # Data volume
        "collection_stats": collection_stats,
        
        # Computed scores
        "system_iq": _compute_system_iq(snapshot, dlq_stats, db_ok, pending_events),
        "resilience_score": _compute_resilience(snapshot, db_ok),
    })
    
    return snapshot


def _compute_system_iq(snapshot: dict, dlq_stats: dict, db_ok: bool, pending: int) -> int:
    """
    System IQ: 0-100 composite health score.
    Based on real metrics, not hardcoded.
    """
    score = 100
    
    # Penalize high error rate
    error_rate = snapshot.get("error_rate_5xx", 0) * 100
    if error_rate > 5:
        score -= 30
    elif error_rate > 1:
        score -= 15
    elif error_rate > 0.1:
        score -= 5
    
    # Penalize high latency
    p99 = snapshot.get("p99_latency_ms", 0)
    if p99 > 2000:
        score -= 20
    elif p99 > 1000:
        score -= 10
    elif p99 > 500:
        score -= 5
    
    # Penalize DLQ issues
    dlq_size = dlq_stats.get("dlq_size", 0)
    if dlq_size > 100:
        score -= 20
    elif dlq_size > 10:
        score -= 10
    elif dlq_size > 0:
        score -= 3
    
    # Penalize DB issues
    if not db_ok:
        score -= 25
    
    # Penalize pending events
    if pending > 100:
        score -= 10
    elif pending > 10:
        score -= 5
    
    return max(0, min(100, score))


def _compute_resilience(snapshot: dict, db_ok: bool) -> float:
    """
    Resilience score: 0-100% based on error rate and uptime.
    """
    if not db_ok:
        return 0.0
    
    total = snapshot.get("total_requests", 0)
    if total == 0:
        return 100.0  # No requests = no failures
    
    errors = snapshot.get("total_errors_5xx", 0)
    success_rate = ((total - errors) / total) * 100
    return round(success_rate, 2)
