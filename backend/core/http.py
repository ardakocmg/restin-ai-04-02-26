"""HTTP response utilities"""
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

def _iso():
    return datetime.now(timezone.utc).isoformat()

def ok(data=None, meta=None):
    return {"ok": True, "data": data, "meta": meta or {}}

def err(code, message, meta=None, details=None):
    o = {"ok": False, "error": {"code": code, "message": message}, "meta": meta or {}}
    if details is not None:
        o["error"]["details"] = details
    return o

def api_error_handler(request, exc):
    from core.errors import ApiError
    meta = {"request_id": request.headers.get("x-request-id"), "ts": _iso()}
    return JSONResponse(
        status_code=exc.status,
        content=err(exc.code, exc.message, meta=meta, details=exc.details)
    )
