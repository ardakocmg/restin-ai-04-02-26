"""
📜 Audit Trail API Routes — Rule 49
Forensic-grade immutable audit logging with geo-location.
"""
from fastapi import APIRouter, Request, Query, Depends
from services.audit_trail import log_audit_event, get_audit_trail, get_audit_summary
from core.role_guard import require_owner


def create_audit_router():
    router = APIRouter(prefix="/audit", tags=["Audit Trail"])

    @router.get("/", dependencies=[Depends(require_owner)])
    async def list_audit_events(
        request: Request,
        venue_id: str = Query(...),
        resource_type: str = Query(""),
        actor_id: str = Query(""),
        severity: str = Query(""),
        start_date: str = Query(""),
        end_date: str = Query(""),
        limit: int = Query(100, le=500),
        skip: int = Query(0),
    ):
        """List audit trail events with filters."""
        db = request.app.mongodb
        events = await get_audit_trail(
            db,
            venue_id=venue_id,
            resource_type=resource_type,
            actor_id=actor_id,
            severity=severity,
            start_date=start_date or None,
            end_date=end_date or None,
            limit=limit,
            skip=skip,
        )
        return events

    @router.get("/summary", dependencies=[Depends(require_owner)])
    async def audit_summary(
        request: Request,
        venue_id: str = Query(...),
        days: int = Query(30),
    ):
        """Get audit trail summary stats."""
        db = request.app.mongodb
        return await get_audit_summary(db, venue_id, days)

    @router.post("/")
    async def create_audit_event_endpoint(request: Request):
        """Manually log an audit event (for admin use)."""
        db = request.app.mongodb
        body = await request.json()

        event_id = await log_audit_event(
            db,
            action=body.get("action", "manual.entry"),
            actor_id=body.get("actor_id", ""),
            actor_name=body.get("actor_name", ""),
            actor_role=body.get("actor_role", ""),
            resource_type=body.get("resource_type", "manual"),
            resource_id=body.get("resource_id", ""),
            venue_id=body.get("venue_id", ""),
            tenant_id=body.get("tenant_id", ""),
            details=body.get("details"),
            severity=body.get("severity", "info"),
            fiscal_status=body.get("fiscal_status"),
        )
        return {"id": event_id, "status": "logged"}

    return router
