"""
MetricsCollector — In-memory APM metrics for Hyperscale Dashboard

Thread-safe request/latency/error tracking with circular buffers.
No external dependencies (no Redis/Prometheus needed).

Usage:
    from core.metrics_collector import metrics
    metrics.record_request(latency_ms=142.5, status_code=200, path="/api/orders")
    snapshot = metrics.get_snapshot()
"""

import time
import threading
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

logger = logging.getLogger("metrics_collector")

# ─── Configuration ─────────────────────────────────────────────────────────────
LATENCY_BUFFER_SIZE = 2000       # Keep last 2000 request latencies for percentile calc
RPS_WINDOW_SECONDS = 60          # Calculate RPS over last 60 seconds
HISTORY_BUFFER_SIZE = 90         # Keep 90 time-series snapshots (30 min at 20s intervals)
SNAPSHOT_INTERVAL_SECONDS = 20   # Background snapshot every 20s


@dataclass
class RequestRecord:
    """Single request measurement."""
    timestamp: float
    latency_ms: float
    status_code: int
    path: str


class MetricsCollector:
    """
    Collects real-time application metrics in-memory.
    
    All methods are thread-safe via a single lock.
    Designed for single-instance deployment (Render).
    """
    
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._start_time = time.monotonic()
        self._boot_time = time.time()
        
        # Request tracking
        self._total_requests: int = 0
        self._total_errors_4xx: int = 0
        self._total_errors_5xx: int = 0
        
        # Circular buffer for latency percentiles
        self._latency_buffer: deque = deque(maxlen=LATENCY_BUFFER_SIZE)
        
        # Sliding window for RPS calculation
        self._request_timestamps: deque = deque(maxlen=10000)
        
        # Time-series history for charts
        self._latency_history: deque = deque(maxlen=HISTORY_BUFFER_SIZE)
        self._rps_history: deque = deque(maxlen=HISTORY_BUFFER_SIZE)
        self._error_history: deque = deque(maxlen=HISTORY_BUFFER_SIZE)
        
        # Path-level stats (top endpoints)
        self._path_counts: Dict[str, int] = {}
        self._path_latency_sum: Dict[str, float] = {}

    def record_request(self, latency_ms: float, status_code: int, path: str = "") -> None:
        """Record a completed HTTP request."""
        now = time.time()
        with self._lock:
            self._total_requests += 1
            self._latency_buffer.append(latency_ms)
            self._request_timestamps.append(now)
            
            if 400 <= status_code < 500:
                self._total_errors_4xx += 1
            elif status_code >= 500:
                self._total_errors_5xx += 1
            
            # Normalize path (strip IDs for grouping)
            clean_path = self._normalize_path(path)
            self._path_counts[clean_path] = self._path_counts.get(clean_path, 0) + 1
            self._path_latency_sum[clean_path] = self._path_latency_sum.get(clean_path, 0) + latency_ms

    def take_snapshot(self) -> None:
        """Take a point-in-time snapshot for time-series charts."""
        with self._lock:
            now = time.time()
            
            # Calculate current RPS
            cutoff = now - RPS_WINDOW_SECONDS
            recent = [t for t in self._request_timestamps if t > cutoff]
            rps = len(recent) / RPS_WINDOW_SECONDS if recent else 0
            
            # Calculate current percentiles
            latencies = sorted(self._latency_buffer) if self._latency_buffer else [0]
            p50 = self._percentile(latencies, 50)
            p95 = self._percentile(latencies, 95)
            p99 = self._percentile(latencies, 99)
            
            # Error rate (last window)
            total_recent = len(recent) if recent else 1
            # Count 5xx in last window — approximate from rate
            error_rate = (self._total_errors_5xx / max(1, self._total_requests)) * 100
            
            # Store snapshots
            label = time.strftime("%H:%M:%S", time.gmtime(now))
            self._latency_history.append({
                "time": label,
                "p50": round(p50, 1),
                "p95": round(p95, 1),
                "p99": round(p99, 1),
            })
            self._rps_history.append({
                "time": label,
                "value": round(rps, 2),
            })
            self._error_history.append({
                "time": label,
                "value": round(error_rate, 4),
            })

    def get_snapshot(self) -> Dict:
        """Get current metrics snapshot for the Hyperscale Dashboard API."""
        with self._lock:
            now = time.time()
            
            # Current RPS
            cutoff = now - RPS_WINDOW_SECONDS
            recent = [t for t in self._request_timestamps if t > cutoff]
            rps = len(recent) / RPS_WINDOW_SECONDS if recent else 0
            
            # Percentiles
            latencies = sorted(self._latency_buffer) if self._latency_buffer else [0]
            p50 = self._percentile(latencies, 50)
            p95 = self._percentile(latencies, 95)
            p99 = self._percentile(latencies, 99)
            
            # Error rates
            total = max(1, self._total_requests)
            error_rate_5xx = self._total_errors_5xx / total
            error_rate_4xx = self._total_errors_4xx / total
            
            # Process metrics
            process_info = self._get_process_info()
            
            # Uptime
            uptime_seconds = time.monotonic() - self._start_time
            
            # Top endpoints
            top_endpoints = sorted(
                [
                    {
                        "path": p,
                        "count": c,
                        "avg_latency_ms": round(self._path_latency_sum.get(p, 0) / max(1, c), 1)
                    }
                    for p, c in self._path_counts.items()
                ],
                key=lambda x: x["count"],
                reverse=True
            )[:10]
            
            return {
                # Live metrics
                "p99_latency_ms": round(p99, 1),
                "p95_latency_ms": round(p95, 1),
                "p50_latency_ms": round(p50, 1),
                "rps": round(rps, 2),
                "error_rate_5xx": round(error_rate_5xx, 6),
                "error_rate_4xx": round(error_rate_4xx, 6),
                "total_requests": self._total_requests,
                "total_errors_5xx": self._total_errors_5xx,
                "total_errors_4xx": self._total_errors_4xx,
                
                # Process metrics
                "memory_usage_mb": process_info["memory_mb"],
                "cpu_percent": process_info["cpu_percent"],
                "thread_count": process_info["thread_count"],
                
                # Uptime
                "uptime_seconds": round(uptime_seconds),
                "boot_time": self._boot_time,
                
                # Time-series history (for charts)
                "latency_history": list(self._latency_history),
                "rps_history": list(self._rps_history),
                "error_history": list(self._error_history),
                
                # Top endpoints
                "top_endpoints": top_endpoints,
                
                # Infrastructure (single instance)
                "region": "us-east-1 (Washington D.C.)",
                "instance_count": 1,
                "has_redis": False,
                "has_cdn": True,
            }

    def _percentile(self, sorted_data: List[float], pct: int) -> float:
        """Calculate percentile from sorted list."""
        if not sorted_data:
            return 0.0
        idx = int(len(sorted_data) * pct / 100)
        idx = min(idx, len(sorted_data) - 1)
        return sorted_data[idx]

    def _normalize_path(self, path: str) -> str:
        """Normalize API paths by replacing IDs with :id."""
        if not path:
            return "unknown"
        parts = path.strip("/").split("/")
        normalized = []
        for part in parts:
            # If looks like a MongoDB ObjectId or UUID, replace with :id
            if len(part) == 24 and all(c in "0123456789abcdef" for c in part.lower()):
                normalized.append(":id")
            elif len(part) == 36 and part.count("-") == 4:
                normalized.append(":id")
            elif part.isdigit():
                normalized.append(":id")
            else:
                normalized.append(part)
        return "/" + "/".join(normalized)

    def _get_process_info(self) -> Dict:
        """Get process-level metrics."""
        if HAS_PSUTIL:
            try:
                proc = psutil.Process()
                mem_info = proc.memory_info()
                return {
                    "memory_mb": round(mem_info.rss / 1024 / 1024, 1),
                    "cpu_percent": round(proc.cpu_percent(interval=0), 1),
                    "thread_count": proc.num_threads(),
                }
            except Exception:
                pass
        
        # Fallback without psutil
        import os
        return {
            "memory_mb": 0,
            "cpu_percent": 0,
            "thread_count": threading.active_count(),
        }


# ─── Singleton ─────────────────────────────────────────────────────────────────
metrics = MetricsCollector()
