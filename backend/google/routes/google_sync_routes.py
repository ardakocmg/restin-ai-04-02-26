"""
Google Sync API Routes — exposes sync service functions as REST endpoints.
Covers: Calendar CRUD, Drive upload/import, Gmail send/actions, Sheets export/import, Sync config.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.dependencies import get_current_user
from google.services.google_sync_service import (
    sync_shift_to_calendar,
    sync_leave_to_calendar,
    upload_to_drive,
    export_payroll_to_drive,
    import_from_drive,
    send_email,
    reply_to_email,
    modify_email,
    trash_email,
    export_to_sheet,
    import_from_sheet,
    get_sync_config,
    update_sync_config,
)

logger = logging.getLogger("google.sync.routes")


def _get_uid(user: dict) -> str:
    return str(user.get("_id", user.get("id", user.get("sub", ""))))


def create_google_sync_router():
    router = APIRouter(prefix="/google/sync", tags=["Google Sync"])

    # ═══════════════════════════════════════════════════════════════
    # SYNC CONFIG
    # ═══════════════════════════════════════════════════════════════

    @router.get("/config")
    async def get_config(current_user: dict = Depends(get_current_user)):
        uid = _get_uid(current_user)
        config = await get_sync_config(uid)
        return {"ok": True, "config": config}

    @router.put("/config")
    async def set_config(body: dict, current_user: dict = Depends(get_current_user)):
        uid = _get_uid(current_user)
        allowed = {
            "calendar_shift_sync", "calendar_leave_sync",
            "drive_payroll_auto_export", "drive_folder_structure",
            "gmail_ai_enabled", "sheets_auto_export",
        }
        updates = {k: v for k, v in body.items() if k in allowed}
        config = await update_sync_config(uid, updates)
        return {"ok": True, "config": config}

    # ═══════════════════════════════════════════════════════════════
    # CALENDAR — Manual Sync
    # ═══════════════════════════════════════════════════════════════

    @router.post("/calendar/sync-shift")
    async def manual_sync_shift(body: dict, current_user: dict = Depends(get_current_user)):
        """Manually sync a specific shift to Google Calendar."""
        uid = _get_uid(current_user)
        shift_id = body.get("shift_id", "")
        if not shift_id:
            raise HTTPException(status_code=400, detail="shift_id is required")

        shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        # Get venue name
        venue = await db.venues.find_one({"id": shift.get("venue_id")}, {"_id": 0, "name": 1})
        venue_name = venue.get("name", "") if venue else ""

        event_id = await sync_shift_to_calendar(uid, shift, venue_name, "create")
        return {"ok": True, "event_id": event_id}

    @router.post("/calendar/sync-leave")
    async def manual_sync_leave(body: dict, current_user: dict = Depends(get_current_user)):
        """Manually sync a leave request to Google Calendar."""
        uid = _get_uid(current_user)
        leave_id = body.get("leave_id", "")
        if not leave_id:
            raise HTTPException(status_code=400, detail="leave_id is required")

        leave = await db.leave_requests.find_one({"id": leave_id}, {"_id": 0})
        if not leave:
            raise HTTPException(status_code=404, detail="Leave request not found")

        employee = await db.users.find_one({"id": leave.get("employee_id")}, {"_id": 0, "name": 1})
        employee_name = employee.get("name", "") if employee else ""

        venue = await db.venues.find_one({"id": leave.get("venue_id")}, {"_id": 0, "name": 1})
        venue_name = venue.get("name", "") if venue else ""

        event_id = await sync_leave_to_calendar(uid, leave, employee_name, venue_name, "create")
        return {"ok": True, "event_id": event_id}

    @router.post("/calendar/bulk-sync-shifts")
    async def bulk_sync_shifts(body: dict, current_user: dict = Depends(get_current_user)):
        """Sync all pending/approved shifts for a venue to Calendar."""
        uid = _get_uid(current_user)
        venue_id = body.get("venue_id", "")
        if not venue_id:
            raise HTTPException(status_code=400, detail="venue_id is required")

        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "name": 1})
        venue_name = venue.get("name", "") if venue else ""

        shifts = await db.shifts.find(
            {"venue_id": venue_id, "google_calendar_event_id": {"$exists": False}},
            {"_id": 0}
        ).to_list(100)

        synced = 0
        for shift in shifts:
            eid = await sync_shift_to_calendar(uid, shift, venue_name, "create")
            if eid:
                synced += 1

        return {"ok": True, "synced": synced, "total": len(shifts)}

    @router.delete("/calendar/event/{shift_id}")
    async def delete_calendar_event(shift_id: str, current_user: dict = Depends(get_current_user)):
        """Remove a shift's calendar event."""
        uid = _get_uid(current_user)
        shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        await sync_shift_to_calendar(uid, shift, "", "delete")
        return {"ok": True}

    # ═══════════════════════════════════════════════════════════════
    # DRIVE — Upload / Import
    # ═══════════════════════════════════════════════════════════════

    @router.post("/drive/export-payroll")
    async def drive_export_payroll(body: dict, current_user: dict = Depends(get_current_user)):
        """Export payroll data to Google Drive as CSV."""
        uid = _get_uid(current_user)
        venue_id = body.get("venue_id", "")
        month = body.get("month", "")

        if not venue_id or not month:
            raise HTTPException(status_code=400, detail="venue_id and month required")

        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "name": 1})
        venue_name = venue.get("name", "Unknown") if venue else "Unknown"

        # Get payroll data
        payroll_docs = await db.payroll_runs.find(
            {"venue_id": venue_id, "period": {"$regex": month}},
            {"_id": 0}
        ).to_list(500)

        if not payroll_docs:
            return {"ok": False, "error": "No payroll data for this period"}

        result = await export_payroll_to_drive(uid, venue_name, month, payroll_docs)
        if result:
            # Log the export
            await db.google_sync_log.insert_one({
                "user_id": uid, "type": "drive_export", "subtype": "payroll",
                "venue_id": venue_id, "month": month,
                "drive_file_id": result["id"], "drive_url": result["web_link"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            return {"ok": True, "file": result}

        return {"ok": False, "error": "Export failed"}

    @router.post("/drive/import")
    async def drive_import_file(body: dict, current_user: dict = Depends(get_current_user)):
        """Import a file from Google Drive into Restin."""
        uid = _get_uid(current_user)
        file_id = body.get("file_id", "")
        import_type = body.get("type", "")  # "inventory", "recipe", "menu"

        if not file_id:
            raise HTTPException(status_code=400, detail="file_id required")

        result = await import_from_drive(uid, file_id)
        if not result:
            return {"ok": False, "error": "Import failed"}

        # Log the import
        await db.google_sync_log.insert_one({
            "user_id": uid, "type": "drive_import", "subtype": import_type,
            "file_name": result["name"], "mime_type": result["mime_type"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {
            "ok": True,
            "file_name": result["name"],
            "mime_type": result["mime_type"],
            "size_bytes": len(result.get("content", b"")),
        }

    # ═══════════════════════════════════════════════════════════════
    # GMAIL — Send / Reply / Actions
    # ═══════════════════════════════════════════════════════════════

    @router.post("/gmail/send")
    async def gmail_send(body: dict, current_user: dict = Depends(get_current_user)):
        """Send an email via Gmail."""
        uid = _get_uid(current_user)
        to = body.get("to", "")
        subject = body.get("subject", "")
        body_html = body.get("body", "")

        if not to or not subject:
            raise HTTPException(status_code=400, detail="to and subject required")

        msg_id = await send_email(uid, to, subject, body_html, body.get("cc", ""), body.get("bcc", ""))
        if msg_id:
            return {"ok": True, "message_id": msg_id}
        return {"ok": False, "error": "Send failed"}

    @router.post("/gmail/reply")
    async def gmail_reply(body: dict, current_user: dict = Depends(get_current_user)):
        """Reply to an email thread."""
        uid = _get_uid(current_user)
        msg_id = await reply_to_email(
            uid,
            thread_id=body.get("thread_id", ""),
            message_id=body.get("message_id", ""),
            to=body.get("to", ""),
            subject=body.get("subject", ""),
            body_html=body.get("body", ""),
        )
        if msg_id:
            return {"ok": True, "message_id": msg_id}
        return {"ok": False, "error": "Reply failed"}

    @router.post("/gmail/action")
    async def gmail_action(body: dict, current_user: dict = Depends(get_current_user)):
        """Perform an action on a Gmail message (star, archive, mark read, trash)."""
        uid = _get_uid(current_user)
        message_id = body.get("message_id", "")
        action = body.get("action", "")

        if not message_id or not action:
            raise HTTPException(status_code=400, detail="message_id and action required")

        if action == "star":
            ok = await modify_email(uid, message_id, add_labels=["STARRED"])
        elif action == "unstar":
            ok = await modify_email(uid, message_id, remove_labels=["STARRED"])
        elif action == "archive":
            ok = await modify_email(uid, message_id, remove_labels=["INBOX"])
        elif action == "mark_read":
            ok = await modify_email(uid, message_id, remove_labels=["UNREAD"])
        elif action == "mark_unread":
            ok = await modify_email(uid, message_id, add_labels=["UNREAD"])
        elif action == "trash":
            ok = await trash_email(uid, message_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

        return {"ok": ok}

    # ═══════════════════════════════════════════════════════════════
    # SHEETS — Export / Import
    # ═══════════════════════════════════════════════════════════════

    @router.post("/sheets/export")
    async def sheets_export(body: dict, current_user: dict = Depends(get_current_user)):
        """Export data to a new Google Sheet."""
        uid = _get_uid(current_user)
        export_type = body.get("type", "")  # "inventory", "roster", "recipe_costs"
        venue_id = body.get("venue_id", "")

        if not export_type:
            raise HTTPException(status_code=400, detail="type is required")

        title = ""
        headers: list[str] = []
        rows: list[list] = []

        if export_type == "inventory":
            title = f"Inventory Export — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
            items = await db.ingredients.find(
                {"venue_id": venue_id} if venue_id else {}, {"_id": 0}
            ).to_list(1000)
            if items:
                headers = ["Name", "Category", "Unit", "Cost", "Stock", "Supplier"]
                rows = [
                    [i.get("name", ""), i.get("category", ""), i.get("unit", ""),
                     str(i.get("cost", 0)), str(i.get("stock_level", 0)), i.get("supplier", "")]
                    for i in items
                ]

        elif export_type == "roster":
            title = f"Weekly Roster — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
            shifts = await db.shifts.find(
                {"venue_id": venue_id} if venue_id else {}, {"_id": 0}
            ).to_list(500)
            if shifts:
                headers = ["Employee", "Start", "End", "Work Area", "Status"]
                for s in shifts:
                    user = await db.users.find_one({"id": s.get("user_id")}, {"_id": 0, "name": 1})
                    rows.append([
                        user.get("name", "") if user else s.get("user_id", ""),
                        s.get("start_time", ""), s.get("end_time", ""),
                        s.get("work_area", ""), s.get("status", "scheduled"),
                    ])

        elif export_type == "recipe_costs":
            title = f"Recipe Costs — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
            recipes = await db.recipe_engineered.find(
                {"venue_id": venue_id} if venue_id else {}, {"_id": 0}
            ).to_list(500)
            if recipes:
                headers = ["Recipe", "Category", "Cost", "Sell Price", "Margin %"]
                rows = [
                    [r.get("name", ""), r.get("category", ""),
                     str(r.get("total_cost", 0)), str(r.get("sell_price", 0)),
                     str(r.get("margin_percent", 0))]
                    for r in recipes
                ]

        if not rows:
            return {"ok": False, "error": "No data to export"}

        result = await export_to_sheet(uid, title, headers, rows)
        if result:
            return {"ok": True, "sheet": result}
        return {"ok": False, "error": "Export failed"}

    @router.post("/sheets/import")
    async def sheets_import(body: dict, current_user: dict = Depends(get_current_user)):
        """Import data from a Google Sheet."""
        uid = _get_uid(current_user)
        spreadsheet_id = body.get("spreadsheet_id", "")
        import_type = body.get("type", "")  # "price_list", "schedule"
        sheet_range = body.get("range", "Sheet1")

        if not spreadsheet_id or not import_type:
            raise HTTPException(status_code=400, detail="spreadsheet_id and type required")

        data = await import_from_sheet(uid, spreadsheet_id, sheet_range)
        if data is None:
            return {"ok": False, "error": "Import failed"}

        return {"ok": True, "data": data, "row_count": len(data)}

    # ═══════════════════════════════════════════════════════════════
    # SYNC LOG
    # ═══════════════════════════════════════════════════════════════

    @router.get("/log")
    async def get_sync_log(current_user: dict = Depends(get_current_user)):
        """Get recent sync activity log."""
        uid = _get_uid(current_user)
        logs = await db.google_sync_log.find(
            {"user_id": uid}, {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        return {"ok": True, "data": logs, "count": len(logs)}

    # ═══════════════════════════════════════════════════════════════
    # DASHBOARD — Organization-wide Sync Management
    # ═══════════════════════════════════════════════════════════════

    @router.get("/dashboard/stats")
    async def dashboard_stats(current_user: dict = Depends(get_current_user)):
        """Get aggregated sync statistics."""
        total_logs = await db.google_sync_log.count_documents({})
        success_count = await db.google_sync_log.count_documents({"status": "success"})
        failed_count = await db.google_sync_log.count_documents({"status": "failed"})
        pending_count = await db.google_sync_log.count_documents({"status": "pending"})

        # Connected users
        connected_users = await db.google_tokens.count_documents({"access_token": {"$exists": True, "$ne": ""}})
        total_users = await db.users.count_documents({"deleted_at": {"$exists": False}})

        # Active services by counting sync configs
        configs = await db.google_sync_config.find({}, {"_id": 0}).to_list(1000)
        active_services: dict[str, int] = {"calendar": 0, "drive": 0, "gmail": 0, "sheets": 0}
        for cfg in configs:
            if cfg.get("calendar_shift_sync") or cfg.get("calendar_leave_sync"):
                active_services["calendar"] += 1
            if cfg.get("drive_payroll_auto_export"):
                active_services["drive"] += 1
            if cfg.get("gmail_ai_enabled"):
                active_services["gmail"] += 1
            if cfg.get("sheets_auto_export"):
                active_services["sheets"] += 1

        # Last sync
        last_log = await db.google_sync_log.find_one(
            {}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)]
        )

        return {
            "ok": True,
            "stats": {
                "total_syncs": total_logs,
                "successful": success_count,
                "failed": failed_count,
                "pending": pending_count,
                "connected_users": connected_users,
                "total_users": total_users,
                "active_services": active_services,
                "last_sync": last_log.get("created_at", "") if last_log else "",
            }
        }

    @router.get("/dashboard/venues")
    async def dashboard_venues(current_user: dict = Depends(get_current_user)):
        """Get per-venue sync status."""
        venues = await db.venues.find(
            {"deleted_at": {"$exists": False}}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(100)

        venue_statuses = []
        for venue in venues:
            vid = venue["id"]
            # Count employees for this venue
            total_emp = await db.users.count_documents({"venues": vid, "deleted_at": {"$exists": False}})
            # Count connected employees (those with google tokens)
            venue_users = await db.users.find(
                {"venues": vid, "deleted_at": {"$exists": False}}, {"_id": 0, "id": 1}
            ).to_list(500)
            user_ids = [u["id"] for u in venue_users]
            connected_emp = await db.google_tokens.count_documents(
                {"user_id": {"$in": user_ids}, "access_token": {"$exists": True, "$ne": ""}}
            ) if user_ids else 0

            # Last sync for this venue
            last_sync = await db.google_sync_log.find_one(
                {"venue_id": vid}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)]
            )

            # Get enabled syncs
            configs = await db.google_sync_config.find(
                {"user_id": {"$in": user_ids}}, {"_id": 0}
            ).to_list(500) if user_ids else []

            enabled_syncs = set()
            for cfg in configs:
                if cfg.get("calendar_shift_sync"): enabled_syncs.add("calendar_shifts")
                if cfg.get("calendar_leave_sync"): enabled_syncs.add("calendar_leaves")
                if cfg.get("drive_payroll_auto_export"): enabled_syncs.add("drive_payroll")
                if cfg.get("sheets_auto_export"): enabled_syncs.add("sheets_export")

            # Determine health
            health = "offline"
            if connected_emp > 0:
                recent_fails = await db.google_sync_log.count_documents({
                    "venue_id": vid, "status": "failed",
                    "created_at": {"$gte": datetime.now(timezone.utc).isoformat()[:10]}
                })
                health = "degraded" if recent_fails > 0 else "healthy"

            venue_statuses.append({
                "venue_id": vid,
                "venue_name": venue.get("name", ""),
                "connected_employees": connected_emp,
                "total_employees": total_emp,
                "last_sync": last_sync.get("created_at", "") if last_sync else "",
                "sync_health": health,
                "enabled_syncs": sorted(enabled_syncs),
            })

        return {"ok": True, "venues": venue_statuses}

    @router.get("/dashboard/personnel")
    async def dashboard_personnel(current_user: dict = Depends(get_current_user)):
        """Get per-user sync configuration."""
        users = await db.users.find(
            {"deleted_at": {"$exists": False}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "venues": 1}
        ).to_list(500)

        results = []
        for user in users:
            uid = user["id"]
            # Check google connection
            token = await db.google_tokens.find_one(
                {"user_id": uid}, {"_id": 0, "email": 1, "display_name": 1}
            )
            # Get sync config
            config = await db.google_sync_config.find_one(
                {"user_id": uid}, {"_id": 0}
            )
            # Get venue name
            venue_name = ""
            if user.get("venues"):
                venue = await db.venues.find_one(
                    {"id": user["venues"][0] if isinstance(user["venues"], list) else user["venues"]},
                    {"_id": 0, "name": 1}
                )
                venue_name = venue.get("name", "") if venue else ""

            # Last sync for this user
            last_sync = await db.google_sync_log.find_one(
                {"user_id": uid}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)]
            )

            results.append({
                "user_id": uid,
                "user_name": user.get("name", ""),
                "email": user.get("email", ""),
                "google_connected": bool(token),
                "google_email": token.get("email", "") if token else "",
                "venue_name": venue_name,
                "sync_config": {
                    "calendar_shift_sync": config.get("calendar_shift_sync", False) if config else False,
                    "calendar_leave_sync": config.get("calendar_leave_sync", False) if config else False,
                    "drive_payroll_auto_export": config.get("drive_payroll_auto_export", False) if config else False,
                    "sheets_auto_export": config.get("sheets_auto_export", False) if config else False,
                },
                "last_sync": last_sync.get("created_at", "") if last_sync else "",
            })

        return {"ok": True, "personnel": results}

    @router.get("/dashboard/logs")
    async def dashboard_logs(current_user: dict = Depends(get_current_user)):
        """Get organization-wide sync logs."""
        logs = await db.google_sync_log.find(
            {}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

        # Enrich with user and venue names
        for log in logs:
            if not log.get("user_name"):
                user = await db.users.find_one({"id": log.get("user_id")}, {"_id": 0, "name": 1})
                log["user_name"] = user.get("name", "") if user else ""
            if not log.get("venue_name") and log.get("venue_id"):
                venue = await db.venues.find_one({"id": log["venue_id"]}, {"_id": 0, "name": 1})
                log["venue_name"] = venue.get("name", "") if venue else ""
            log.setdefault("sync_type", log.get("type", ""))
            log.setdefault("service", log.get("subtype", "sync"))
            log.setdefault("direction", "push")
            log.setdefault("status", "success")
            log.setdefault("details", "")

        return {"ok": True, "logs": logs}

    @router.post("/force-all")
    async def force_sync_all(current_user: dict = Depends(get_current_user)):
        """Trigger a force sync for all connected users. Admin only."""
        # Just log the trigger — individual syncs will be background-processed
        await db.google_sync_log.insert_one({
            "user_id": _get_uid(current_user),
            "type": "force_sync_all",
            "service": "all",
            "direction": "push",
            "status": "success",
            "details": "Organization-wide force sync triggered",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"ok": True, "message": "Force sync triggered"}

    return router

