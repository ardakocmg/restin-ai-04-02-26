"""
JWT Configuration — ENV loading + startup validation.

Env vars (all optional, safe defaults):
  AUTH_JWT_SIGNING_MODE        HS256_ONLY | RS256_ONLY  (default HS256_ONLY)
  AUTH_JWT_ISSUER              default "restin.ai"
  AUTH_JWT_AUDIENCE            default "restin.ai"
  AUTH_JWT_ACTIVE_KID          required when RS256
  AUTH_JWT_RS256_PRIVATE_KEY_PEM   PEM string or file path
  AUTH_JWT_RS256_PUBLIC_KEYS       JSON map {kid: PEM}
"""
import os
import logging
from enum import Enum
from typing import Literal

logger = logging.getLogger("jwt.config")


class SigningMode(str, Enum):
    HS256_ONLY = "HS256_ONLY"
    RS256_ONLY = "RS256_ONLY"


# ── Loaded config values ─────────────────────────────────────────────

SIGNING_MODE: SigningMode = SigningMode(
    os.environ.get("AUTH_JWT_SIGNING_MODE", "HS256_ONLY").upper()
)

JWT_ISSUER: str = os.environ.get("AUTH_JWT_ISSUER", "restin.ai")
JWT_AUDIENCE: str = os.environ.get("AUTH_JWT_AUDIENCE", "restin.ai")
JWT_EXPIRATION_HOURS: int = int(os.environ.get("JWT_EXPIRATION_HOURS", "12"))

ACTIVE_KID: str = os.environ.get("AUTH_JWT_ACTIVE_KID", "")

# Raw PEM / path strings — actual loading happens in jwt_keys.py
RS256_PRIVATE_KEY_RAW: str = os.environ.get("AUTH_JWT_RS256_PRIVATE_KEY_PEM", "")
RS256_PUBLIC_KEYS_RAW: str = os.environ.get("AUTH_JWT_RS256_PUBLIC_KEYS", "")

# Legacy HS256 secret (from existing config.py)
HS256_SECRET: str = os.environ.get("JWT_SECRET", "")


def validate_jwt_startup() -> None:
    """
    Fail-fast validation at server startup.
    Raises RuntimeError on misconfig.
    """
    mode = SIGNING_MODE

    if mode == SigningMode.HS256_ONLY:
        # HS256 requires JWT_SECRET ≥ 16 chars (existing behavior)
        if not HS256_SECRET or len(HS256_SECRET) < 16:
            raise RuntimeError(
                "JWT_SECRET misconfigured (missing/too short). "
                "Required when AUTH_JWT_SIGNING_MODE=HS256_ONLY. Refuse to start."
            )
        logger.info("JWT config OK: mode=HS256_ONLY, issuer=%s", JWT_ISSUER)

    elif mode == SigningMode.RS256_ONLY:
        errors: list[str] = []
        if not ACTIVE_KID:
            errors.append("AUTH_JWT_ACTIVE_KID is required for RS256_ONLY mode")
        if not RS256_PRIVATE_KEY_RAW:
            errors.append("AUTH_JWT_RS256_PRIVATE_KEY_PEM is required for RS256_ONLY mode")
        if not RS256_PUBLIC_KEYS_RAW:
            errors.append("AUTH_JWT_RS256_PUBLIC_KEYS is required for RS256_ONLY mode")
        if errors:
            raise RuntimeError(
                "RS256 JWT misconfigured. Errors:\n  - " + "\n  - ".join(errors)
            )
        logger.info(
            "JWT config OK: mode=RS256_ONLY, active_kid=%s, issuer=%s",
            ACTIVE_KID, JWT_ISSUER
        )
    else:
        raise RuntimeError(f"Unknown AUTH_JWT_SIGNING_MODE: {mode}")
