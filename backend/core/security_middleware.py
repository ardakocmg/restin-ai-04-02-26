"""
Security Middleware - Rate Limiting and Device Pairing
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import time
import logging

_rl_logger = logging.getLogger("middleware.rate_limit")

# Sensitive endpoint rate limits (lower = stricter)
_SENSITIVE_PATHS = {
    "/api/auth/login": 20,
    "/api/auth/pin-login": 20,
    "/api/auth/register": 10,
    "/api/auth/forgot-password": 10,
    "/api/auth/mfa": 20,
    "/api/payments": 60,
    "/api/billing": 60,
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute=1000):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)       # Global per-IP tracking
        self.path_requests = defaultdict(list)   # Per-path sensitive tracking
        self.cleanup_interval = 60
        self.last_cleanup = time.time()

    def _get_path_limit(self, path: str) -> int:
        """Check if path matches a sensitive endpoint and return its limit."""
        for sensitive_path, limit in _SENSITIVE_PATHS.items():
            if path.startswith(sensitive_path):
                return limit
        return self.requests_per_minute

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and CORS preflight
        if request.url.path in ['/health', '/api/health']:
            return await call_next(request)
        if request.method == 'OPTIONS':
            return await call_next(request)

        # Get client identifier
        client_host = request.client.host if request.client else "unknown"
        client_id = request.headers.get('X-Device-Id') or client_host
        path = request.url.path

        # Cleanup old entries periodically
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            self.cleanup_old_requests()
            self.last_cleanup = current_time

        now = time.time()
        minute_ago = now - 60

        # 1. Check GLOBAL rate limit per client
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > minute_ago
        ]

        if len(self.requests[client_id]) >= self.requests_per_minute:
            _rl_logger.warning("Global rate limit hit: client=%s, count=%d", client_id, len(self.requests[client_id]))
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {self.requests_per_minute} requests per minute."
            )

        # 2. Check SENSITIVE PATH rate limit
        path_limit = self._get_path_limit(path)
        effective_limit = path_limit

        if path_limit < self.requests_per_minute:
            path_key = f"{client_id}:{path}"
            self.path_requests[path_key] = [
                req_time for req_time in self.path_requests[path_key]
                if req_time > minute_ago
            ]

            if len(self.path_requests[path_key]) >= path_limit:
                _rl_logger.warning("Sensitive path rate limit hit: client=%s, path=%s, count=%d",
                                   client_id, path, len(self.path_requests[path_key]))
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many requests to {path}. Max {path_limit} per minute."
                )
            self.path_requests[path_key].append(now)

        # Record global request
        self.requests[client_id].append(now)

        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers['X-RateLimit-Limit'] = str(effective_limit)
        response.headers['X-RateLimit-Remaining'] = str(
            effective_limit - len(self.requests[client_id]) if effective_limit == self.requests_per_minute
            else max(0, effective_limit - len(self.path_requests.get(f"{client_id}:{path}", [])))
        )
        
        return response

    def cleanup_old_requests(self):
        """Remove old request records"""
        minute_ago = time.time() - 60
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id]
                if req_time > minute_ago
            ]
            if not self.requests[client_id]:
                del self.requests[client_id]
        
        # Also cleanup path-specific tracking
        for path_key in list(self.path_requests.keys()):
            self.path_requests[path_key] = [
                req_time for req_time in self.path_requests[path_key]
                if req_time > minute_ago
            ]
            if not self.path_requests[path_key]:
                del self.path_requests[path_key]


class DevicePairingMiddleware(BaseHTTPMiddleware):
    """Device pairing for offline authentication"""
    
    def __init__(self, app, db):
        super().__init__(app)
        self.db = db
        self.pairing_ttl_minutes = 15

    async def dispatch(self, request: Request, call_next):
        # Only check pairing for device endpoints
        if not request.url.path.startswith('/api/devices/'):
            return await call_next(request)

        device_id = request.headers.get('X-Device-Id')
        if not device_id:
            raise HTTPException(status_code=401, detail="Device ID required")

        # Check if device is paired
        device = await self.db.devices.find_one(
            {"device_id": device_id},
            {"_id": 0}
        )

        if not device or not device.get("paired"):
            raise HTTPException(status_code=403, detail="Device not paired")

        # Check pairing expiry (if TTL is set)
        if device.get("paired_at"):
            paired_at = datetime.fromisoformat(device["paired_at"])
            expiry = paired_at + timedelta(minutes=self.pairing_ttl_minutes * 60)  # Extended for production
            
            if datetime.now(timezone.utc) > expiry:
                raise HTTPException(status_code=403, detail="Device pairing expired. Please re-pair.")

        # Proceed
        return await call_next(request)
