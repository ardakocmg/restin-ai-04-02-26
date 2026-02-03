from fastapi import APIRouter, Depends, Query
from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_hr_audit_router():
    router = APIRouter(prefix="/hr/audit-logs", tags=["hr-audit-logs"])

    @router.get("")
    async def list_audit_logs(
        venue_id: str = Query(...),
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=200),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        query = {"venue_id": venue_id}
        total = await db.hr_audit_logs.count_documents(query)
        cursor = db.hr_audit_logs.find(query, {"_id": 0}).sort("created_at", -1)
        cursor = cursor.skip((page - 1) * page_size).limit(page_size)
        items = await cursor.to_list(page_size)
        return {"success": True, "items": items, "total": total}

    return router
