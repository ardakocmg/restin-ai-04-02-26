import hashlib
import hmac
import os
import logging
import bcrypt
from typing import Optional

logger = logging.getLogger("core.security")

def compute_pin_index(pin: str) -> str:
    """Fast SHA256 index for PIN lookup. NOT for security — only for DB query."""
    return hashlib.sha256(f"restin:pin:{pin}".encode()).hexdigest()

def hash_pin(pin: str) -> str:
    """Hash PIN with bcrypt (salted). Rounds=6 for PINs (rate-limited, 4-digit)."""
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt(rounds=6)).decode()

def verify_pin(pin: str, stored_hash: str) -> bool:
    """Verify PIN against stored bcrypt hash. Also handles legacy SHA256 hashes."""
    if not stored_hash:
        return False
    # Legacy SHA256 hashes are 64-char hex strings
    if len(stored_hash) == 64 and all(c in '0123456789abcdef' for c in stored_hash):
        return hashlib.sha256(pin.encode()).hexdigest() == stored_hash
    # Bcrypt hashes start with $2b$ or $2a$
    try:
        return bcrypt.checkpw(pin.encode(), stored_hash.encode())
    except (ValueError, TypeError):
        return False

def _legacy_sha256_pin(pin: str) -> str:
    """Legacy SHA256 hash — used only for migration lookups."""
    return hashlib.sha256(pin.encode()).hexdigest()

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with random salt (no bcrypt dependency)."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 310_000)
    return salt.hex() + ':' + key.hex()

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored PBKDF2 hash."""
    try:
        salt_hex, key_hex = stored_hash.split(':')
        salt = bytes.fromhex(salt_hex)
        stored_key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 310_000)
        return hmac.compare_digest(new_key, stored_key)
    except (ValueError, AttributeError):
        return False

def compute_hash(data: dict, prev_hash: str) -> str:
    payload = f"{prev_hash}:{str(data)}"
    return hashlib.sha256(payload.encode()).hexdigest()

def create_jwt_token(user_id: str, venue_id: str, role: str, device_id: Optional[str] = None) -> str:
    """
    Create a signed JWT access token.
    Delegates to app.core.auth.jwt_sign (HS256 or RS256 based on config).
    Signature unchanged — zero callsite modifications needed.
    """
    from app.core.auth.jwt_sign import sign_access_token
    return sign_access_token(user_id, venue_id, role, device_id)

def verify_jwt_token(token: str, allow_expired: bool = False) -> dict:
    """
    Verify a JWT token (dual HS256 + RS256).
    Delegates to app.core.auth.jwt_verify.
    Returns payload dict or None on failure (backward compatible).
    """
    from app.core.auth.jwt_verify import verify_jwt, JwtAuthError
    try:
        return verify_jwt(token, allow_expired=allow_expired)
    except JwtAuthError as exc:
        logger.warning("JWT verification failed: %s", exc.code)
        if exc.code == "TOKEN_EXPIRED" and not allow_expired:
            import jwt as pyjwt
            raise pyjwt.ExpiredSignatureError(exc.message)
        return None

