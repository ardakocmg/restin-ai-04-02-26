"""Admin routes - backfill, error codes, system logs"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user
from models import UserRole
from services.error_registry import list_all_error_codes


def create_admin_router():
    router = APIRouter(prefix="/admin", tags=["admin"])

    @router.get("/error-codes")
    async def get_error_codes(current_user: dict = Depends(get_current_user)):
        """List all system error codes"""
        if current_user["role"] not in [UserRole.OWNER, UserRole.PRODUCT_OWNER]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return list_all_error_codes()

    @router.get("/logs")
    async def get_system_logs(
        level: str = None,
        code: str = None,
        limit: int = 100,
        current_user: dict = Depends(get_current_user)
    ):
        """Get system logs with filters"""
        if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.OWNER, UserRole.IT_ADMIN]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {}
        if level:
            query["level"] = level
        if code:
            query["code"] = code
        
        logs = await db.system_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
        return logs

    @router.post("/logs/{log_id}/ack")
    async def acknowledge_log(
        log_id: str,
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        """Acknowledge system log"""
        if current_user["role"] not in [UserRole.PRODUCT_OWNER, UserRole.OWNER, UserRole.IT_ADMIN, UserRole.GENERAL_MANAGER, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.system_logs.update_one(
            {"id": log_id},
            {"$set": {
                "acknowledged": data.get("acknowledged", True),
                "acknowledged_by": current_user["id"],
                "acknowledged_at": now
            }}
        )
        
        return {"ok": True, "message": "Log acknowledged"}

    @router.post("/backfill-all")
    async def backfill_all_ids(current_user: dict = Depends(get_current_user)):
        """Backfill IDs for all venues (admin only)"""
        if current_user["role"] != UserRole.PRODUCT_OWNER:
            raise HTTPException(status_code=403, detail="Product Owner access required")
        
        venues = await db.venues.find({}, {"_id": 0, "id": 1}).to_list(1000)
        results = []
        
        for venue in venues:
            venue_id = venue["id"]
            
            orders = await db.orders.find({"venue_id": venue_id, "display_id": {"$exists": False}}, {"_id": 0}).to_list(10000)
            
            for order in orders:
                from services.id_service import ensure_ids
                updated_order = await ensure_ids(db, "ORDER", order, venue_id)
                await db.orders.update_one(
                    {"id": order["id"]},
                    {"$set": {"display_id": updated_order.get("display_id")}}
                )
            
            results.append({"venue_id": venue_id, "orders_updated": len(orders)})
        
        return {"message": "Backfill complete", "results": results}

    return router
