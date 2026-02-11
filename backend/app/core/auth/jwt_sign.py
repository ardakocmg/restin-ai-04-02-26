"""
JWT Signing — mode-switchable token issuance.

HS256_ONLY  →  jwt.encode(payload, JWT_SECRET, algorithm="HS256")
RS256_ONLY  →  jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": ...})
"""
import jwt as pyjwt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from .jwt_config import (
    SIGNING_MODE,
    SigningMode,
    HS256_SECRET,
    JWT_ISSUER,
    JWT_AUDIENCE,
    JWT_EXPIRATION_HOURS,
)
from .jwt_keys import get_signing_key

logger = logging.getLogger("jwt.sign")


def sign_access_token(
    user_id: str,
    venue_id: str,
    role: str,
    device_id: Optional[str] = None,
) -> str:
    """
    Create a signed JWT access token.
    Signing algorithm determined by AUTH_JWT_SIGNING_MODE.
    Claims are kept identical to the existing system.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "venue_id": venue_id,
        "role": role,
        "device_id": device_id,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRATION_HOURS),
    }

    if SIGNING_MODE == SigningMode.HS256_ONLY:
        token = pyjwt.encode(payload, HS256_SECRET, algorithm="HS256")
        logger.debug("Signed HS256 token for user=%s", user_id)
        return token

    elif SIGNING_MODE == SigningMode.RS256_ONLY:
        kid, private_key = get_signing_key()
        token = pyjwt.encode(
            payload,
            private_key,
            algorithm="RS256",
            headers={"kid": kid},
        )
        logger.debug("Signed RS256 token for user=%s, kid=%s", user_id, kid)
        return token

    else:
        raise RuntimeError(f"Unknown signing mode: {SIGNING_MODE}")
