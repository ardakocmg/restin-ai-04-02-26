"""Notification Badge Counts - Aggregated notification counts for sidebar/header badges"""
from fastapi import APIRouter, Depends, Query
from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_notification_badge_router():
    router = APIRouter(tags=["notifications"])

    @router.get("/notifications/badge-counts")
    async def get_badge_counts(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        """
        Aggregated badge counts for sidebar domains and individual menu items.
        Queries real collections to build per-domain and per-page counts.
        """
        await check_venue_access(current_user, venue_id)
        user_id = current_user.get("id", "")

        # ─── POS Domain ──────────────────────────────────────────
        open_orders = await db.orders.count_documents(
            {"venue_id": venue_id, "status": {"$nin": ["closed", "voided"]}}
        )
        pending_kds = await db.kds_tickets.count_documents(
            {"venue_id": venue_id, "status": {"$in": ["pending", "preparing"]}}
        )
        pos_total = open_orders + pending_kds

        # ─── HR Domain ───────────────────────────────────────────
        pending_approvals = await db.approval_requests.count_documents(
            {"venue_id": venue_id, "status": "pending"}
        )
        pending_leave = await db.approval_requests.count_documents(
            {"venue_id": venue_id, "status": "pending", "type": "leave"}
        )
        hr_total = pending_approvals

        # ─── Inventory Domain ────────────────────────────────────
        low_stock = await db.inventory_items.count_documents(
            {"venue_id": venue_id, "is_low_stock": True}
        )
        pending_waste = await db.waste_logs.count_documents(
            {"venue_id": venue_id, "status": "pending_review"}
        )
        inventory_total = low_stock + pending_waste

        # ─── Collab Domain (user-specific) ───────────────────────
        unread_inbox = await db.notifications.count_documents(
            {"venue_id": venue_id, "identity_id": user_id, "status": "UNREAD"}
        )
        pending_tasks = await db.collab_tasks.count_documents(
            {"venue_id": venue_id, "assignee_id": user_id, "status": {"$in": ["open", "in_progress"]}}
        )
        collab_total = unread_inbox + pending_tasks

        # ─── Restin/AI Domain ────────────────────────────────────
        ai_unread = await db.notifications.count_documents(
            {"venue_id": venue_id, "identity_id": user_id, "status": "UNREAD", "type": {"$in": ["AI_RESPONSE", "VOICE_COMMAND"]}}
        )
        crm_pending = await db.crm_tickets.count_documents(
            {"venue_id": venue_id, "status": "open"}
        )
        restin_total = ai_unread + crm_pending

        # ─── Finance Domain ─────────────────────────────────────
        pending_invoices = await db.invoices.count_documents(
            {"venue_id": venue_id, "status": "pending"}
        )

        # ─── Analytics Domain (alerts) ──────────────────────────
        active_alerts = await db.alerts.count_documents(
            {"venue_id": venue_id, "status": "active"}
        )

        # ─── Build response ──────────────────────────────────────
        badges = {
            "home": 0,
            "pos": pos_total,
            "hr": hr_total,
            "inventory": inventory_total,
            "finance": pending_invoices,
            "analytics": active_alerts,
            "restin": restin_total,
            "collab": collab_total,
            "venue-settings": 0,
            "org-settings": 0,
            "system-admin": 0,
        }

        items = {
            "/manager/pos-dashboard": open_orders,
            "/manager/kds": pending_kds,
            "/manager/review-risk": 0,
            "/manager/hr/approvals": pending_approvals,
            "/manager/hr/leave-management": pending_leave,
            "/manager/inventory-waste": pending_waste,
            "/manager/collab/inbox": unread_inbox,
            "/manager/collab/tasks": pending_tasks,
            "/manager/restin/voice": ai_unread,
            "/manager/restin/crm": crm_pending,
        }

        total = sum(badges.values())

        return {
            "ok": True,
            "badges": badges,
            "items": items,
            "total": total
        }

    return router
