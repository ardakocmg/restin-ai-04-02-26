# Auth service helpers
import hashlib
import pyotp
from datetime import datetime, timezone, timedelta
from core.database import get_database
from typing import Optional

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

async def check_rate_limit(device_id: str, max_attempts: int = 5, window_minutes: int = 5) -> bool:
    """Check if device has exceeded rate limit"""
    db = get_database()
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    
    failed_attempts = await db.login_attempts.count_documents({
        "device_id": device_id,
        "success": False,
        "attempted_at": {"$gte": cutoff_time.isoformat()}
    })
    
    return failed_attempts >= max_attempts

async def log_login_attempt(device_id: Optional[str], pin: str, app: str, success: bool, 
                            fail_reason: Optional[str] = None, user_id: Optional[str] = None,
                            venue_id: Optional[str] = None):
    """Log a login attempt for auditing and rate limiting"""
    db = get_database()
    pin_partial = "**" + pin[-2:] if len(pin) >= 2 else "**"
    
    await db.login_attempts.insert_one({
        "device_id": device_id,
        "pin_hash_partial": pin_partial,
        "app": app,
        "success": success,
        "fail_reason": fail_reason,
        "user_id": user_id,
        "venue_id": venue_id,
        "attempted_at": datetime.now(timezone.utc).isoformat()
    })
