"""
Observability Middleware - Automatic Error Capture
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timezone
import json
import traceback

class ObservabilityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, db):
        super().__init__(app)
        self.db = db
        self.error_codes_to_capture = [
            'INSUFFICIENT_STOCK',
            'PRINTER_OFFLINE',
            'KDS_UNAVAILABLE',
            'PAYMENT_FAILED',
            'INTERNAL_ERROR'
        ]

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get('X-Request-ID', f"req_{datetime.now().timestamp()}")
        
        try:
            response = await call_next(request)
            
            # Check for error responses
            if response.status_code >= 500:
                await self.capture_error(
                    request=request,
                    response=response,
                    request_id=request_id,
                    error_code='INTERNAL_ERROR',
                    severity='CRITICAL'
                )
            
            return response
            
        except Exception as e:
            # Capture unhandled exceptions
            await self.capture_error(
                request=request,
                response=None,
                request_id=request_id,
                error_code='UNHANDLED_EXCEPTION',
                severity='CRITICAL',
                exception=e
            )
            raise

    async def capture_error(self, request, response, request_id, error_code, severity, exception=None):
        """Capture error to inbox"""
        try:
            venue_id = request.headers.get('X-Venue-ID') or 'unknown'
            
            # Determine domain from path
            path = str(request.url.path)
            domain = 'SYSTEM'
            if '/pos/' in path:
                domain = 'POS'
            elif '/kds/' in path:
                domain = 'KDS'
            elif '/inventory/' in path:
                domain = 'INVENTORY'
            
            from services.observability_service import get_observability_service
            obs_service = get_observability_service(self.db)
            
            await obs_service.create_error_inbox_item(
                venue_id=venue_id,
                domain=domain,
                error_code=error_code,
                error_message=str(exception) if exception else f"HTTP {response.status_code if response else 500}",
                source={
                    "source_type": "REQUEST",
                    "request_id": request_id,
                    "path": path,
                    "method": request.method
                },
                entity_refs={},
                steps=[],
                severity=severity
            )
        except Exception as e:
            # Don't let error capture break the app
            print(f"Failed to capture error: {e}")
