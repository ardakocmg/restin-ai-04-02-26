"""
📜 Immutable Audit Trail — Rule 49
Forensic-grade audit logging with geo-location for sensitive actions.
Every transaction gets a fiscal_status flag (Malta/Exo compliance).
"""
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId


async def log_audit_event(
    db,
    *,
    action: str,
    actor_id: str,
    actor_name: str = "",
    actor_role: str = "",
    resource_type: str,
    resource_id: str = "",
    venue_id: str = "",
    tenant_id: str = "",
    details: Optional[dict] = None,
    ip_address: str = "",
    user_agent: str = "",
    geo_location: Optional[dict] = None,
    severity: str = "info",  # info | warning | critical
    fiscal_status: Optional[str] = None,  # pending | submitted | cleared
) -> str:
    """
    Write an immutable audit log entry.
    These records are NEVER updated or deleted — append-only.
    """
    entry = {
        "_id": ObjectId(),
        "action": action,
        "actor": {
            "id": actor_id,
            "name": actor_name,
            "role": actor_role,
        },
        "resource": {
            "type": resource_type,
            "id": resource_id,
        },
        "venue_id": venue_id,
        "tenant_id": tenant_id,
        "details": details or {},
        "context": {
            "ip_address": ip_address,
            "user_agent": user_agent,
            "geo_location": geo_location,  # { lat, lng, country, city }
        },
        "severity": severity,
        "fiscal_status": fiscal_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "immutable": True,  # Flag — this record must never be modified
        "version": 1,
    }

    result = await db["audit_trail"].insert_one(entry)
    return str(result.inserted_id)


async def get_audit_trail(
    db,
    *,
    venue_id: str = "",
    resource_type: str = "",
    resource_id: str = "",
    actor_id: str = "",
    severity: str = "",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
) -> list:
    """Query the audit trail with filters."""
    query: dict = {}

    if venue_id:
        query["venue_id"] = venue_id
    if resource_type:
        query["resource.type"] = resource_type
    if resource_id:
        query["resource.id"] = resource_id
    if actor_id:
        query["actor.id"] = actor_id
    if severity:
        query["severity"] = severity
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        query["timestamp"] = date_filter

    cursor = db["audit_trail"].find(query).sort("timestamp", -1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


async def get_audit_summary(db, venue_id: str, days: int = 30) -> dict:
    """Get audit summary stats for a venue."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    pipeline = [
        {"$match": {"venue_id": venue_id, "timestamp": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$severity",
            "count": {"$sum": 1},
        }},
    ]

    result = {}
    async for doc in db["audit_trail"].aggregate(pipeline):
        result[doc["_id"]] = doc["count"]

    total = await db["audit_trail"].count_documents(
        {"venue_id": venue_id, "timestamp": {"$gte": cutoff}}
    )

    return {
        "total": total,
        "info": result.get("info", 0),
        "warning": result.get("warning", 0),
        "critical": result.get("critical", 0),
        "period_days": days,
    }


# Common audit action constants
class AuditActions:
    # Auth
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"
    LOGIN_FAILED = "auth.login_failed"
    PASSWORD_CHANGED = "auth.password_changed"

    # Orders
    ORDER_CREATED = "order.created"
    ORDER_MODIFIED = "order.modified"
    ORDER_VOIDED = "order.voided"
    ORDER_REFUNDED = "order.refunded"
    ORDER_DISCOUNT = "order.discount_applied"

    # Payments
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_REFUNDED = "payment.refunded"
    CASH_DRAWER_OPENED = "payment.cash_drawer"

    # Inventory
    STOCK_ADJUSTED = "inventory.stock_adjusted"
    WASTE_LOGGED = "inventory.waste_logged"
    TRANSFER_CREATED = "inventory.transfer_created"

    # HR
    EMPLOYEE_CREATED = "hr.employee_created"
    EMPLOYEE_TERMINATED = "hr.employee_terminated"
    PAYROLL_RUN = "hr.payroll_run"
    CLOCK_OVERRIDE = "hr.clock_override"

    # Admin
    SETTINGS_CHANGED = "admin.settings_changed"
    FEATURE_FLAG_TOGGLED = "admin.feature_flag_toggled"
    DATA_EXPORTED = "admin.data_exported"
    USER_IMPERSONATED = "admin.user_impersonated"
    PRICE_CHANGED = "admin.price_changed"

    # Fiscal
    FISCAL_RECEIPT_ISSUED = "fiscal.receipt_issued"
    FISCAL_VOID = "fiscal.void"
    TAX_REPORT_GENERATED = "fiscal.tax_report"
