"""
Tableside Ordering Routes — Server-to-table mapping + mobile POS support
(Lightspeed Parity Phase 3)
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)


def create_tableside_router():
    router = APIRouter(prefix="/tableside", tags=["tableside-ordering"])

    @router.get("/assignments/{venue_id}")
    async def get_assignments(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get server-to-table assignments for a venue."""
        assignments = await db.server_assignments.find(
            {"venue_id": venue_id, "active": True}, {"_id": 0}
        ).sort("server_name", 1).to_list(100)
        return {"success": True, "data": assignments}

    @router.post("/assignments")
    async def create_assignment(
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Assign tables to a server."""
        venue_id = payload.get("venue_id")
        server_id = payload.get("server_id")
        server_name = payload.get("server_name", "")
        table_names = payload.get("table_names", [])

        if not venue_id or not server_id:
            raise HTTPException(status_code=400, detail="venue_id and server_id required")

        # Upsert — one active assignment per server
        doc = {
            "id": str(uuid.uuid4())[:12],
            "venue_id": venue_id,
            "server_id": server_id,
            "server_name": server_name,
            "table_names": table_names,
            "active": True,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "assigned_by": current_user["id"],
        }
        await db.server_assignments.update_one(
            {"venue_id": venue_id, "server_id": server_id, "active": True},
            {"$set": doc},
            upsert=True,
        )
        return {"success": True, "data": doc}

    @router.delete("/assignments/{assignment_id}")
    async def remove_assignment(
        assignment_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Deactivate an assignment."""
        result = await db.server_assignments.update_one(
            {"id": assignment_id},
            {"$set": {"active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return {"success": True}

    @router.get("/my-tables")
    async def get_my_tables(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get tables assigned to current server (for mobile POS view)."""
        assignment = await db.server_assignments.find_one(
            {"venue_id": venue_id, "server_id": current_user["id"], "active": True},
            {"_id": 0}
        )
        if not assignment:
            return {"success": True, "tables": [], "message": "No tables assigned"}

        table_names = assignment.get("table_names", [])
        # Fetch table details
        tables = await db.tables.find(
            {"venue_id": venue_id, "name": {"$in": table_names}},
            {"_id": 0}
        ).to_list(50)

        return {
            "success": True,
            "tables": tables,
            "assignment": assignment,
        }

    @router.get("/config/{venue_id}")
    async def get_tableside_config(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get tableside ordering config."""
        config = await db.tableside_config.find_one(
            {"venue_id": venue_id}, {"_id": 0}
        )
        if not config:
            config = {
                "id": str(uuid.uuid4())[:12],
                "venue_id": venue_id,
                "enabled": True,
                "require_pin_for_discount": True,
                "require_pin_for_void": True,
                "show_item_photos": True,
                "quick_reorder": True,
                "tap_to_pay_enabled": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.tableside_config.insert_one(config)
        return {"success": True, "data": config}

    @router.put("/config/{venue_id}")
    async def update_tableside_config(
        venue_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Update tableside ordering config."""
        allowed = {
            "enabled", "require_pin_for_discount", "require_pin_for_void",
            "show_item_photos", "quick_reorder", "tap_to_pay_enabled",
        }
        update = {k: v for k, v in payload.items() if k in allowed}
        update["updated_at"] = datetime.now(timezone.utc).isoformat()

        await db.tableside_config.update_one(
            {"venue_id": venue_id}, {"$set": update}, upsert=True
        )
        return {"success": True}

    return router
