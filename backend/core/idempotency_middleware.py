"""
Idempotency Middleware - Prevent Duplicate Operations

Handles X-Idempotency-Key headers to ensure offline replay doesn't create duplicates.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from core.database import db
from datetime import datetime, timezone, timedelta
import json

class IdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, ttl_hours=24):
        super().__init__(app)
        self.ttl_hours = ttl_hours
        self.idempotent_methods = {'POST', 'PUT', 'PATCH', 'DELETE'}

    async def dispatch(self, request: Request, call_next):
        # Only check idempotency for mutating operations
        if request.method not in self.idempotent_methods:
            return await call_next(request)

        # Check for idempotency key header
        idempotency_key = request.headers.get('X-Idempotency-Key')
        
        if not idempotency_key:
            # No key provided - proceed normally
            return await call_next(request)

        # Check if this request was already processed
        existing = await db.idempotency_keys.find_one(
            {"key": idempotency_key},
            {"_id": 0}
        )

        if existing:
            # Request already processed - return cached response
            if existing.get("status_code") == 200 or existing.get("status_code") == 201:
                print(f"♻️ Idempotent replay: {idempotency_key} - returning cached response")
                
                # Return cached successful response
                return Response(
                    content=json.dumps(existing.get("response_body", {})),
                    status_code=existing.get("status_code", 200),
                    headers={"Content-Type": "application/json"},
                    media_type="application/json"
                )
            else:
                # Previous request failed - allow retry
                print(f"🔄 Idempotent retry: {idempotency_key} - previous attempt failed")

        # Process the request
        response = await call_next(request)

        # Cache the response for successful operations
        if 200 <= response.status_code < 300:
            content_type = response.headers.get("Content-Type", "")
            
            # Only cache application/json responses. Streaming/binary will crash body_iterator consumption
            if "application/json" in content_type:
                try:
                    # Read response body
                    body = b""
                    async for chunk in response.body_iterator:
                        body += chunk

                    response_body = json.loads(body.decode())

                    # Store idempotency record
                    await db.idempotency_keys.insert_one({
                        "key": idempotency_key,
                        "method": request.method,
                        "path": str(request.url.path),
                        "status_code": response.status_code,
                        "response_body": response_body,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=self.ttl_hours)).isoformat(),
                        "device_id": request.headers.get('X-Device-Id'),
                        "offline_replay": request.headers.get('X-Offline-Replay') == 'true'
                    })

                    print(f"💾 Idempotency key cached: {idempotency_key} for path {request.url.path}")

                    # Recreate response with the body
                    return Response(
                        content=body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type
                    )
                except Exception as e:
                    print(f"⚠️ Failed to cache idempotency: {e}")
                    # If we failed to cache, we still need to return the response, but body_iterator might be consumed.
                    # Since we only try caching on application/json, returning the consumed body is necessary here.
                    if 'body' in locals():
                        return Response(content=body, status_code=response.status_code, headers=dict(response.headers), media_type=response.media_type)

        return response

async def cleanup_expired_idempotency_keys():
    """Background task to clean up expired idempotency keys"""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.idempotency_keys.delete_many({
        "expires_at": {"$lt": now}
    })
    
    if result.deleted_count > 0:
        print(f"🧹 Cleaned up {result.deleted_count} expired idempotency keys")
    
    return result.deleted_count
