import hashlib
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from .config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def compute_hash(data: dict, prev_hash: str) -> str:
    payload = f"{prev_hash}:{str(data)}"
    return hashlib.sha256(payload.encode()).hexdigest()

def create_jwt_token(user_id: str, venue_id: str, role: str, device_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "venue_id": venue_id,
        "role": role,
        "device_id": device_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str, allow_expired: bool = False) -> dict:
    try:
        options = {"verify_exp": not allow_expired}
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options=options)
        return payload
    except jwt.ExpiredSignatureError:
        if not allow_expired:
            raise
        # If allow_expired, decode without verification
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_signature": False})
        return payload
    except jwt.InvalidTokenError:
        return None
