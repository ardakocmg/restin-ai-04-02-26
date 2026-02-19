import hashlib
import logging
from typing import Optional

logger = logging.getLogger("app.core.security")

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def compute_hash(data: dict, prev_hash: str) -> str:
    payload = f"{prev_hash}:{str(data)}"
    return hashlib.sha256(payload.encode()).hexdigest()

def create_jwt_token(user_id: str, venue_id: str, role: str, device_id: Optional[str] = None) -> str:
    """Delegate to unified JWT signing system."""
    from .auth.jwt_sign import sign_access_token
    return sign_access_token(user_id, venue_id, role, device_id)

def verify_jwt_token(token: str, allow_expired: bool = False) -> dict:
    """Delegate to unified JWT verify system (same secret used for sign+verify)."""
    from .auth.jwt_verify import verify_jwt, JwtAuthError
    try:
        return verify_jwt(token, allow_expired=allow_expired)
    except JwtAuthError as exc:
        logger.warning("JWT verification failed: %s", exc.code)
        if exc.code == "TOKEN_EXPIRED" and not allow_expired:
            import jwt as pyjwt
            raise pyjwt.ExpiredSignatureError(exc.message)
        return None
