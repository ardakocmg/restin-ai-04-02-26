"""
Memory Cache Layer - Resolves MongoDB read bottlenecks for hyperscale
Provides TTL (Time-To-Live) based caching for high-traffic endpoints.
"""
import time
import asyncio
from typing import Any, Dict, Optional, Tuple
import functools

class MemoryCache:
    def __init__(self):
        # Format: { "key": (value, expiration_timestamp_override) }
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = asyncio.Lock()
        
    async def get(self, key: str) -> Optional[Any]:
        """Fetch item from cache if it exists and is not expired."""
        async with self._lock:
            if key in self._store:
                value, exp_time = self._store[key]
                if time.time() < exp_time:
                    return value
                else:
                    # Expired
                    del self._store[key]
        return None
        
    async def set(self, key: str, value: Any, ttl_seconds: int = 60):
        """Set item in cache with a TTL (default 1 minute)."""
        async with self._lock:
            expiration = time.time() + ttl_seconds
            self._store[key] = (value, expiration)
            
    async def invalidate(self, prefix: str):
        """Invalidate all keys starting with a specific prefix (e.g. 'menu_7c41...')."""
        async with self._lock:
            keys_to_delete = [k for k in self._store.keys() if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]

# Global Cache Instance
system_cache = MemoryCache()

# Decorator for fast API caching
def cached(prefix: str, ttl: int = 60):
    """
    Cache decorator for async functions. 
    Constructs a cache key combining the prefix and the function arguments.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate deterministic cache key
            # E.g. menu_items:venue_id=123:limit=50
            args_str = ":".join([str(a) for a in args])
            kwargs_str = ":".join([f"{k}={v}" for k, v in sorted(kwargs.items())])
            cache_key = f"{prefix}:{args_str}:{kwargs_str}"
            
            # 1. Try Cache
            cached_val = await system_cache.get(cache_key)
            if cached_val is not None:
                # Add a marker so we know it came from cache during testing
                if isinstance(cached_val, dict):
                    cached_val["_served_from_memcache"] = True
                return cached_val
                
            # 2. Cache Miss -> Execute Function
            result = await func(*args, **kwargs)
            
            # 3. Store in Cache
            if result:
                await system_cache.set(cache_key, result, ttl_seconds=ttl)
            
            return result
        return wrapper
    return decorator
