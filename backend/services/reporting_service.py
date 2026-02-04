"""
Reporting Service - CRM & OPS Reports
Server-authoritative, cached, permission-aware, PII-safe
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import hashlib
import json

# ==================== BUILT-IN REPORT DEFINITIONS ====================
BUILTIN_REPORTS = [
    {
        "key": "crm_guests_snapshot_v1",
        "title": "Guest Directory Snapshot",
        "description": "Complete guest directory with filters",
        "category": "CRM",
        "default_params": {"q": "", "tags": [], "min_visits": 0, "min_spend": 0},
        "output_formats": ["json", "csv"],
        "permissions_required": ["CRM_VIEW"],
        "columns": [
            {"key": "guest_display_id", "label": "Guest ID", "pii_level": 0},
            {"key": "full_name", "label": "Name", "pii_level": 1},
            {"key": "email", "label": "Email", "pii_level": 2},
            {"key": "phone", "label": "Phone", "pii_level": 2},
            {"key": "tags", "label": "Tags", "pii_level": 0},
            {"key": "last_visit_at", "label": "Last Visit", "pii_level": 0},
            {"key": "visit_count", "label": "Visits", "pii_level": 0},
            {"key": "lifetime_spend", "label": "Lifetime Spend", "pii_level": 1}
        ]
    },
    {
        "key": "crm_guest_segments_v1",
        "title": "Guest Segments",
        "description": "Segment guests by behavior patterns",
        "category": "CRM",
        "default_params": {"segment": "VIP", "days": 30},
        "output_formats": ["json", "csv"],
        "permissions_required": ["CRM_VIEW"],
        "columns": [
            {"key": "segment_name", "label": "Segment", "pii_level": 0},
            {"key": "guest_count", "label": "Count", "pii_level": 0},
            {"key": "recommended_action", "label": "Action", "pii_level": 0}
        ]
    },
    {
        "key": "crm_reservations_perf_v1",
        "title": "Reservation Performance",
        "description": "Reservation metrics and conversion rates",
        "category": "CRM",
        "default_params": {"date_from": "", "date_to": ""},
        "output_formats": ["json", "csv"],
        "permissions_required": ["CRM_VIEW"],
        "columns": [
            {"key": "total", "label": "Total", "pii_level": 0},
            {"key": "confirmed", "label": "Confirmed", "pii_level": 0},
            {"key": "completed", "label": "Completed", "pii_level": 0},
            {"key": "no_show_rate", "label": "No-Show %", "pii_level": 0}
        ]
    },
    {
        "key": "ops_open_orders_v1",
        "title": "Open Orders Status",
        "description": "Current open orders and tickets",
        "category": "OPS",
        "default_params": {"station": "", "status": ""},
        "output_formats": ["json", "csv"],
        "permissions_required": ["ORDERS_VIEW_OPEN"],
        "columns": [
            {"key": "order_display_id", "label": "Order", "pii_level": 0},
            {"key": "table_display_id", "label": "Table", "pii_level": 0},
            {"key": "created_at", "label": "Opened", "pii_level": 0},
            {"key": "status", "label": "Status", "pii_level": 0},
            {"key": "pending_items_count", "label": "Pending Items", "pii_level": 0}
        ]
    },
    {
        "key": "ops_kds_throughput_v1",
        "title": "KDS Throughput Analysis",
        "description": "Kitchen performance metrics",
        "category": "OPS",
        "default_params": {"date_from": "", "date_to": ""},
        "output_formats": ["json", "csv"],
        "permissions_required": ["ORDERS_VIEW_OPEN"],
        "columns": [
            {"key": "station", "label": "Station", "pii_level": 0},
            {"key": "tickets_count", "label": "Tickets", "pii_level": 0},
            {"key": "avg_prep_time", "label": "Avg Prep Time", "pii_level": 0},
            {"key": "late_tickets", "label": "Late Tickets", "pii_level": 0}
        ]
    }
]

async def register_builtin_reports(db, venue_id: str = "GLOBAL"):
    """Register built-in reports (idempotent)"""
    from uuid import uuid4
    
    for report_def in BUILTIN_REPORTS:
        existing = await db.report_defs.find_one({"key": report_def["key"], "venue_id": venue_id}, {"_id": 0})
        if existing:
            continue
        
        doc = {
            "id": str(uuid4()),
            "venue_id": venue_id,
            "key": report_def["key"],
            "title": report_def["title"],
            "description": report_def["description"],
            "category": report_def["category"],
            "default_params": report_def["default_params"],
            "output_formats": report_def["output_formats"],
            "permissions_required": report_def["permissions_required"],
            "columns": report_def["columns"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Generate display_id if ensure_ids available
        try:
            from services.id_service import ensure_ids
            doc = await ensure_ids(db, "REPORT_DEF", doc, venue_id)
        except:
            doc["display_id"] = f"RPT-{report_def['key'][:8].upper()}"
        
        await db.report_defs.insert_one(doc)

def apply_redaction(rows: List[Dict], columns: List[Dict], has_pii_permission: bool) -> List[Dict]:
    """Redact PII fields if user lacks permission"""
    if has_pii_permission:
        return rows
    
    # Build PII field list
    pii_fields = {col["key"] for col in columns if col.get("pii_level", 0) >= 2}
    
    redacted_rows = []
    for row in rows:
        redacted_row = row.copy()
        for field in pii_fields:
            if field in redacted_row:
                redacted_row[field] = "[REDACTED]"
        redacted_rows.append(redacted_row)
    
    return redacted_rows

def cache_key(venue_id: str, report_key: str, params: Dict, redaction_profile: str) -> str:
    """Generate cache key for report results"""
    # Normalize params for consistent caching
    normalized_params = json.dumps(params, sort_keys=True)
    raw_key = f"{venue_id}:{report_key}:{normalized_params}:{redaction_profile}"
    return hashlib.sha256(raw_key.encode()).hexdigest()

async def get_cached_report(db, cache_key_str: str, ttl_seconds: int = 300) -> Optional[Dict]:
    """Get cached report if not expired"""
    cached = await db.report_cache.find_one({"cache_key": cache_key_str}, {"_id": 0})
    if not cached:
        return None
    
    cached_at = datetime.fromisoformat(cached["cached_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    
    if (now - cached_at).total_seconds() > ttl_seconds:
        return None
    
    return cached.get("result")

async def set_cached_report(db, cache_key_str: str, result: Dict):
    """Cache report result"""
    await db.report_cache.update_one(
        {"cache_key": cache_key_str},
        {"$set": {
            "result": result,
            "cached_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

async def run_report(
    db,
    user: Dict,
    venue_id: str,
    report_key: str,
    params: Dict,
    format: str = "json",
    effective_permissions = None
) -> Dict:
    """Execute report and return ReportRun"""
    from uuid import uuid4
    start_time = datetime.now(timezone.utc)
    
    # Get report definition
    report_def = await db.report_defs.find_one({"key": report_key, "venue_id": {"$in": [venue_id, "GLOBAL"]}}, {"_id": 0})
    if not report_def:
        return {
            "status": "failed",
            "error": {"code": "REPORT_NOT_FOUND", "message": f"Report {report_key} not found"}
        }
    
    # Check permissions
    required_perms = set(report_def.get("permissions_required", []))
    if not required_perms.issubset(effective_permissions):
        return {
            "status": "failed",
            "error": {"code": "FORBIDDEN", "message": "Insufficient permissions for this report"}
        }
    
    # Check cache
    has_pii_perm = "CRM_PII_VIEW" in effective_permissions
    redaction_profile = "none" if has_pii_perm else "default"
    cache_key_str = cache_key(venue_id, report_key, params, redaction_profile)
    
    cached_result = await get_cached_report(db, cache_key_str, ttl_seconds=300)
    if cached_result:
        return {
            "status": "done",
            "result_data": cached_result,
            "cache_hit": True,
            "duration_ms": 0
        }
    
    # Execute report
    try:
        result_data = await execute_report_query(db, venue_id, report_key, params, report_def, has_pii_perm)
        
        # Cache result
        await set_cached_report(db, cache_key_str, result_data)
        
        duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
        
        return {
            "status": "done",
            "result_data": result_data,
            "cache_hit": False,
            "duration_ms": duration_ms,
            "row_count": len(result_data.get("rows", []))
        }
        
    except Exception as e:
        return {
            "status": "failed",
            "error": {"code": "REPORT_EXECUTION_FAILED", "message": str(e)}
        }

async def execute_report_query(db, venue_id: str, report_key: str, params: Dict, report_def: Dict, has_pii_perm: bool) -> Dict:
    """Execute specific report query"""
    
    if report_key == "crm_guests_snapshot_v1":
        query = {"venue_id": venue_id}
        if params.get("q"):
            query["$or"] = [
                {"full_name": {"$regex": params["q"], "$options": "i"}},
                {"email": {"$regex": params["q"], "$options": "i"}}
            ]
        if params.get("tags"):
            query["tags"] = {"$in": params["tags"]}
        if params.get("min_visits"):
            query["visit_count"] = {"$gte": params["min_visits"]}
        if params.get("min_spend"):
            query["lifetime_spend"] = {"$gte": params["min_spend"]}
        
        guests = await db.guests.find(query, {"_id": 0}).limit(200).to_list(200)
        
        # Apply redaction
        rows = apply_redaction(guests, report_def["columns"], has_pii_perm)
        
        return {"rows": rows, "summary": {"total_count": len(rows)}}
    
    elif report_key == "crm_guest_segments_v1":
        segment = params.get("segment", "VIP")
        days = params.get("days", 30)
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        query = {"venue_id": venue_id}
        
        if segment == "VIP":
            query["tags"] = {"$in": ["VIP"]}
        elif segment == "AT_RISK":
            query["last_visit_at"] = {"$lt": cutoff_date}
            query["visit_count"] = {"$gte": 3}
        elif segment == "NEW":
            query["visit_count"] = {"$lte": 2}
        elif segment == "FREQUENT":
            query["visit_count"] = {"$gte": 10}
        elif segment == "BIG_SPENDER":
            query["lifetime_spend"] = {"$gte": 1000}
        
        guest_count = await db.guests.count_documents(query)
        sample_guests = await db.guests.find(query, {"_id": 0}).limit(10).to_list(10)
        
        recommended_actions = {
            "VIP": "Send personalized thank you",
            "AT_RISK": "Re-engagement campaign",
            "NEW": "Welcome sequence",
            "FREQUENT": "Loyalty program offer",
            "BIG_SPENDER": "Premium experience invite"
        }
        
        return {
            "rows": [{
                "segment_name": segment,
                "guest_count": guest_count,
                "recommended_action": recommended_actions.get(segment, "Review manually")
            }],
            "summary": {"guests_sample": sample_guests[:5]}  # Redacted separately
        }
    
    elif report_key == "ops_open_orders_v1":
        query = {"venue_id": venue_id, "status": {"$nin": ["CLOSED", "PAID", "CANCELLED"]}}
        
        orders = await db.orders.find(query, {"_id": 0}).limit(200).to_list(200)
        
        rows = []
        for order in orders:
            # Get KDS status
            tickets = await db.kds_tickets.find({"order_id": order["id"]}, {"_id": 0}).to_list(100)
            pending_items = sum(1 for t in tickets for i in t.get("items", []) if i.get("status") != "DONE")
            
            rows.append({
                "order_display_id": order.get("display_id", order["id"][:8]),
                "table_display_id": order.get("table_name", ""),
                "created_at": order.get("created_at", ""),
                "status": order.get("status", ""),
                "pending_items_count": pending_items
            })
        
        return {"rows": rows, "summary": {"total_open": len(rows)}}
    
    elif report_key == "ops_kds_throughput_v1":
        date_from = params.get("date_from") or (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        date_to = params.get("date_to") or datetime.now(timezone.utc).isoformat()
        
        query = {"venue_id": venue_id, "created_at": {"$gte": date_from, "$lte": date_to}}
        
        tickets = await db.kds_tickets.find(query, {"_id": 0}).to_list(1000)
        
        station_stats = {}
        for ticket in tickets:
            station = ticket.get("station", "KITCHEN")
            if station not in station_stats:
                station_stats[station] = {"count": 0, "total_time": 0, "late_count": 0}
            
            station_stats[station]["count"] += 1
            
            # Calculate prep time if available
            if ticket.get("started_at") and ticket.get("done_at"):
                start = datetime.fromisoformat(ticket["started_at"].replace("Z", "+00:00"))
                done = datetime.fromisoformat(ticket["done_at"].replace("Z", "+00:00"))
                prep_seconds = (done - start).total_seconds()
                station_stats[station]["total_time"] += prep_seconds
                
                # Late if > 15 min
                if prep_seconds > 900:
                    station_stats[station]["late_count"] += 1
        
        rows = []
        for station, stats in station_stats.items():
            avg_prep = stats["total_time"] / stats["count"] if stats["count"] > 0 else 0
            rows.append({
                "station": station,
                "tickets_count": stats["count"],
                "avg_prep_time": f"{int(avg_prep / 60)}m {int(avg_prep % 60)}s",
                "late_tickets": stats["late_count"]
            })
        
        return {"rows": rows, "summary": {"total_tickets": len(tickets)}}
    
    else:
        return {"rows": [], "summary": {}, "warnings": ["Report not implemented yet"]}

def suggest_reports_from_search(q: str, user_permissions: set) -> List[Dict]:
    """Suggest relevant reports based on search query"""
    suggestions = []
    q_lower = q.lower()
    
    # CRM suggestions
    if "CRM_VIEW" in user_permissions:
        if "vip" in q_lower:
            suggestions.append({
                "report_key": "crm_guest_segments_v1",
                "title": "VIP Guest Segment",
                "category": "CRM",
                "reason": "Query matches VIP segment",
                "default_params": {"segment": "VIP", "days": 30}
            })
        
        if any(word in q_lower for word in ["guest", "customer", "client"]):
            suggestions.append({
                "report_key": "crm_guests_snapshot_v1",
                "title": "Guest Directory",
                "category": "CRM",
                "reason": "Query matches guest search",
                "default_params": {"q": q, "tags": [], "min_visits": 0}
            })
        
        if "reservation" in q_lower or "booking" in q_lower:
            suggestions.append({
                "report_key": "crm_reservations_perf_v1",
                "title": "Reservation Performance",
                "category": "CRM",
                "reason": "Query matches reservations",
                "default_params": {}
            })
    
    # OPS suggestions
    if "ORDERS_VIEW_OPEN" in user_permissions:
        if "order" in q_lower or "ticket" in q_lower:
            suggestions.append({
                "report_key": "ops_open_orders_v1",
                "title": "Open Orders",
                "category": "OPS",
                "reason": "Query matches orders",
                "default_params": {}
            })
        
        if "kds" in q_lower or "kitchen" in q_lower:
            suggestions.append({
                "report_key": "ops_kds_throughput_v1",
                "title": "KDS Performance",
                "category": "OPS",
                "reason": "Query matches kitchen operations",
                "default_params": {}
            })
    
    return suggestions
