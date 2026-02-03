import uuid
import traceback
import logging
import re
from datetime import datetime, timezone
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from services.log_service import log_system_event
from core.database import get_database
from models.observability import Domain, Severity, StepDetail, StepStatus
from services.observability_service import get_observability_service
from core.security import verify_jwt_token

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

def make_error(code: str, message: str, detail: dict = None, request_id: str = None):
    return {
        "code": code,
        "message": message,
        "detail": detail or {},
        "request_id": request_id
    }

def setup_exception_handlers(app):
    from core.errors import ApiError

    async def capture_observability_error(request, status: int, code: str, message: str, details: dict = None):
        try:
            path = str(request.url.path)
            if path.startswith("/api/observability") or path.startswith("/api/auth"):
                return

            venue_id = request.query_params.get("venue_id")
            if not venue_id:
                match = re.search(r"/venues/([^/]+)/", path)
                if match:
                    venue_id = match.group(1)

            auth_header = request.headers.get("Authorization")
            if not venue_id and auth_header and auth_header.startswith("Bearer "):
                token = auth_header.replace("Bearer ", "")
                payload = verify_jwt_token(token, allow_expired=True)
                if payload:
                    venue_id = payload.get("venue_id")

            venue_id = venue_id or "GLOBAL"

            if "/kds" in path:
                domain = Domain.KDS
            elif "/inventory" in path:
                domain = Domain.INVENTORY
            elif "/orders" in path or "/pos" in path:
                domain = Domain.POS
            elif "/devices" in path:
                domain = Domain.DEVICES
            elif "/reservations" in path or "/guests" in path:
                domain = Domain.RESERVATIONS
            elif "/hr" in path or "/employees" in path:
                domain = Domain.HR
            else:
                domain = Domain.SYSTEM

            severity = Severity.CRITICAL if status >= 500 else Severity.WARNING
            now = datetime.now(timezone.utc).isoformat()
            steps = [
                StepDetail(
                    step_id="CAPTURE_EXCEPTION",
                    title="Capture API exception",
                    domain=domain,
                    status=StepStatus.FAILED,
                    severity=severity,
                    blocking=True,
                    retryable=False,
                    timestamp=now,
                    error_code=code,
                    error_detail={
                        "status_code": status,
                        "path": path
                    }
                )
            ]

            obs_service = get_observability_service(get_database())
            await obs_service.create_error_inbox_item(
                venue_id=venue_id,
                domain=domain,
                error_code=code,
                error_message=message,
                source={
                    "source_type": "API_EXCEPTION",
                    "request_id": getattr(request.state, "request_id", None),
                    "method": request.method,
                    "path": path,
                    "query": dict(request.query_params),
                    "status_code": status,
                    "details": details or {}
                },
                entity_refs={},
                steps=steps,
                severity=severity
            )
        except Exception as capture_error:
            logging.error(f"Observability capture failed: {capture_error}")
    
    @app.exception_handler(ApiError)
    async def api_error_handler(request, exc: ApiError):
        request_id = getattr(request.state, "request_id", None)
        db = get_database()
        
        # Log if error level (4xx client errors are WARN, 5xx are ERROR)
        if exc.status >= 500:
            await log_system_event(
                db,
                level="error",
                code=exc.code,
                message=f"API Error {exc.status}: {exc.message}",
                details={
                    "status_code": exc.status,
                    "code": exc.code,
                    "path": str(request.url),
                    "request_id": request_id,
                    "details": exc.details
                }
            )
            await capture_observability_error(request, exc.status, exc.code, exc.message, exc.details)
        elif exc.status >= 400:
            await log_system_event(
                db,
                level="warning",
                code=exc.code,
                message=f"API Error {exc.status}: {exc.message}",
                details={
                    "status_code": exc.status,
                    "code": exc.code,
                    "path": str(request.url),
                    "request_id": request_id,
                    "details": exc.details
                }
            )
            if exc.status not in [401, 403]:
                await capture_observability_error(request, exc.status, exc.code, exc.message, exc.details)
        
        return JSONResponse(
            status_code=exc.status,
            content={"code": exc.code, "message": exc.message, "request_id": request_id, "details": exc.details}
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc):
        request_id = getattr(request.state, "request_id", None)
        db = get_database()
        
        # Normalize detail
        detail = exc.detail
        if isinstance(detail, dict):
            code = detail.get("code", "HTTP_ERROR")
            message = detail.get("message", str(exc.status_code))
        elif isinstance(detail, str):
            code = "HTTP_ERROR"
            message = detail
        else:
            code = "HTTP_ERROR"
            message = "Request failed"
        
        # Log if error level (4xx client errors are WARN, 5xx are ERROR)
        if exc.status_code >= 500:
            await log_system_event(
                db,
                level="error",
                code=code,
                message=f"HTTP {exc.status_code}: {message}",
                details={
                    "status_code": exc.status_code,
                    "code": code,
                    "path": str(request.url),
                    "request_id": request_id
                }
            )
            await capture_observability_error(request, exc.status_code, code, message, {})
        elif exc.status_code >= 400:
            await log_system_event(
                db,
                level="warning",
                code=code,
                message=f"HTTP {exc.status_code}: {message}",
                details={
                    "status_code": exc.status_code,
                    "code": code,
                    "path": str(request.url),
                    "request_id": request_id
                }
            )
            if exc.status_code not in [401, 403]:
                await capture_observability_error(request, exc.status_code, code, message, {})
        
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": code, "message": message, "request_id": request_id}
        )
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        request_id = getattr(request.state, "request_id", None)
        tb = traceback.format_exc()
        logging.error(f"Unhandled exception: {tb}")
        db = get_database()
        
        await log_system_event(
            db,
            level="critical",
            code="unhandled_exception",
            message=str(exc),
            details={
                "exception_type": type(exc).__name__,
                "traceback": tb,
                "path": str(request.url),
                "request_id": request_id
            }
        )

        await capture_observability_error(request, 500, "INTERNAL_ERROR", str(exc), {"traceback": tb})
        
        return JSONResponse(
            status_code=500,
            content={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "request_id": request_id
            }
        )
