"""
Webhook & Import/Export Audit Log Routes
Based on Shireburn Indigo audit features:
- Webhook call logging
- Import/Export operation audit trail
"""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_webhook_audit_router():
    router = APIRouter(tags=["webhook_audit"])

    @router.get("/venues/{venue_id}/admin/webhook-logs")
    async def list_webhook_logs(
        venue_id: str,
        status: Optional[str] = None,
        limit: int = 100,
        current_user: dict = Depends(get_current_user)
    ):
        """List all webhook execution logs."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if status:
            query["status"] = status

        logs = await db.webhook_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        return logs

    @router.get("/venues/{venue_id}/admin/import-export-logs")
    async def list_import_export_logs(
        venue_id: str,
        operation_type: Optional[str] = None,
        limit: int = 100,
        current_user: dict = Depends(get_current_user)
    ):
        """List all data import/export operations."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if operation_type:
            query["operation_type"] = operation_type

        logs = await db.import_export_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
        return logs

    # Helper: Called internally when an import/export occurs
    async def log_import_export(venue_id: str, user_id: str, operation_type: str, details: dict):
        """Log an import or export operation — called from other routes."""
        log = {
            "id": f"ielog-{uuid.uuid4().hex[:10]}",
            "venue_id": venue_id,
            "user_id": user_id,
            "operation_type": operation_type,  # import_employees, export_payroll, import_clocking, etc.
            "details": details,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.import_export_logs.insert_one(log)
        return log

    # Attach the helper to the router so other modules can use it
    router.log_import_export = log_import_export

    return router
