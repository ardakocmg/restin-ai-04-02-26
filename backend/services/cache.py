"""
Simple in-memory response cache for frequently-accessed API endpoints.

Usage:
    from services.cache import response_cache

    @router.get("/api/inventory/items")
    async def get_items(venue_id: str):
        cache_key = f"items:{venue_id}"
        cached = response_cache.get(cache_key)
        if cached:
            return cached
        result = await fetch_from_db(...)
        response_cache.set(cache_key, result, ttl=60)
        return result

    # Invalidate on mutation:
    response_cache.invalidate(f"items:{venue_id}")
    response_cache.invalidate_prefix("items:")   # all venues
"""

import time
import threading
from typing import Any, Optional


class ResponseCache:
    """Thread-safe in-memory cache with TTL support."""

    def __init__(self, default_ttl: int = 60, max_size: int = 500):
        self._store: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl
        self._max_size = max_size
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Get a cached value. Returns None if missing or expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            value, expires_at = entry
            if time.time() > expires_at:
                del self._store[key]
                self._misses += 1
                return None
            self._hits += 1
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store a value with optional TTL override (seconds)."""
        ttl = ttl if ttl is not None else self._default_ttl
        with self._lock:
            # Evict oldest entries if at capacity
            if len(self._store) >= self._max_size:
                self._evict_expired()
            if len(self._store) >= self._max_size:
                # Remove oldest 10% if still full
                remove_count = max(1, self._max_size // 10)
                sorted_keys = sorted(
                    self._store.keys(),
                    key=lambda k: self._store[k][1]
                )
                for k in sorted_keys[:remove_count]:
                    del self._store[k]

            self._store[key] = (value, time.time() + ttl)

    def invalidate(self, key: str) -> bool:
        """Remove a specific cache entry. Returns True if found."""
        with self._lock:
            return self._store.pop(key, None) is not None

    def invalidate_prefix(self, prefix: str) -> int:
        """Remove all entries whose keys start with prefix."""
        with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]
            return len(keys_to_remove)

    def clear(self) -> None:
        """Clear entire cache."""
        with self._lock:
            self._store.clear()
            self._hits = 0
            self._misses = 0

    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total = self._hits + self._misses
            return {
                "size": len(self._store),
                "max_size": self._max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(self._hits / total * 100, 1) if total > 0 else 0.0,
                "default_ttl": self._default_ttl,
            }

    def _evict_expired(self) -> None:
        """Remove all expired entries (called within lock)."""
        now = time.time()
        expired = [k for k, (_, exp) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]


# ─── Singleton ───────────────────────────────────────────────────────────
response_cache = ResponseCache(default_ttl=60, max_size=500)
"""
Global cache instance. Default 60s TTL, 500 max entries.

Recommended TTLs:
  - Menu items / Recipes:     60s  (change infrequently)
  - Employees / Staff list:   30s
  - Dashboard stats:          15s  (refresh more often)
  - AI conversations:         120s
  - Venue settings:           300s (rarely changes)
"""
