# Audit logging service
import uuid
from datetime import datetime, timezone
from core.database import get_database
from utils.helpers import compute_hash
from models.system import AuditLog

async def create_audit_log(venue_id: str, user_id: str, user_name: str, action: str, 
                           resource_type: str, resource_id: str, details: dict = {}):
    """Create an audit log entry"""
    db = get_database()
    
    # Get last log hash
    last_log = await db.audit_logs.find_one(
        {"venue_id": venue_id}, 
        sort=[("created_at", -1)],
        projection={"_id": 0, "log_hash": 1}
    )
    prev_hash = last_log["log_hash"] if last_log else "genesis"
    
    log_data = {
        "venue_id": venue_id,
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details
    }
    log_hash = compute_hash(log_data, prev_hash)
    
    audit_log = AuditLog(
        venue_id=venue_id,
        user_id=user_id,
        user_name=user_name,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        prev_hash=prev_hash,
        log_hash=log_hash
    )
    await db.audit_logs.insert_one(audit_log.model_dump())
    return audit_log
