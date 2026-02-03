"""
Security Middleware - Rate Limiting and Device Pairing
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import time

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute=1000):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.cleanup_interval = 60  # Cleanup every 60 seconds
        self.last_cleanup = time.time()

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ['/health', '/api/health']:
            return await call_next(request)

        # Get client identifier
        client_id = request.headers.get('X-Device-Id') or request.client.host

        # Cleanup old entries periodically
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            self.cleanup_old_requests()
            self.last_cleanup = current_time

        # Check rate limit
        now = time.time()
        minute_ago = now - 60

        # Filter requests in last minute
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > minute_ago
        ]

        if len(self.requests[client_id]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {self.requests_per_minute} requests per minute."
            )

        # Add current request
        self.requests[client_id].append(now)

        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers['X-RateLimit-Limit'] = str(self.requests_per_minute)
        response.headers['X-RateLimit-Remaining'] = str(
            self.requests_per_minute - len(self.requests[client_id])
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
