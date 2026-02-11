"""
JWT Verification — dual HS256 + RS256 verify.

Always accepts both algorithms (dual-verify).
Error codes: TOKEN_MISSING, TOKEN_MALFORMED, TOKEN_EXPIRED, TOKEN_INVALID_SIGNATURE.
"""
import jwt as pyjwt
import logging
from typing import Optional

from .jwt_config import (
    HS256_SECRET,
    JWT_ISSUER,
    JWT_AUDIENCE,
)
from .jwt_keys import get_verification_key

logger = logging.getLogger("jwt.verify")


class JwtAuthError(Exception):
    """Structured JWT authentication error."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"{code}: {message}")


def verify_jwt(
    token: Optional[str],
    allow_expired: bool = False,
    request_id: Optional[str] = None,
) -> dict:
    """
    Verify a JWT token (HS256 or RS256).
    Returns decoded payload dict.
    Raises JwtAuthError with explicit error codes on failure.
    """
    # ── Missing ──────────────────────────────────────────────────
    if not token:
        _log_failure(request_id, "TOKEN_MISSING", alg=None, kid=None)
        raise JwtAuthError("TOKEN_MISSING", "Authorization token is required")

    # ── Parse header ─────────────────────────────────────────────
    try:
        unverified_header = pyjwt.get_unverified_header(token)
    except pyjwt.exceptions.DecodeError:
        _log_failure(request_id, "TOKEN_MALFORMED", alg=None, kid=None)
        raise JwtAuthError("TOKEN_MALFORMED", "Token header could not be decoded")

    alg = unverified_header.get("alg", "")
    kid = unverified_header.get("kid")

    # ── HS256 verify ─────────────────────────────────────────────
    if alg == "HS256":
        return _verify_hs256(token, allow_expired, request_id, kid)

    # ── RS256 verify ─────────────────────────────────────────────
    if alg == "RS256":
        return _verify_rs256(token, allow_expired, request_id, kid)

    # ── Unknown algorithm ────────────────────────────────────────
    _log_failure(request_id, "TOKEN_MALFORMED", alg=alg, kid=kid)
    raise JwtAuthError("TOKEN_MALFORMED", f"Unsupported algorithm: {alg}")


def _verify_hs256(
    token: str,
    allow_expired: bool,
    request_id: Optional[str],
    kid: Optional[str],
) -> dict:
    """Verify an HS256-signed token."""
    if not HS256_SECRET:
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="HS256", kid=kid)
        raise JwtAuthError(
            "TOKEN_INVALID_SIGNATURE",
            "HS256 verification not available (no JWT_SECRET configured)"
        )
    try:
        options = {
            "verify_exp": not allow_expired,
            # Be lenient on iss/aud for legacy tokens that may not have them
            "verify_iss": False,
            "verify_aud": False,
        }
        payload = pyjwt.decode(
            token, HS256_SECRET, algorithms=["HS256"], options=options
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        if allow_expired:
            return pyjwt.decode(
                token, HS256_SECRET, algorithms=["HS256"],
                options={"verify_exp": False, "verify_iss": False, "verify_aud": False}
            )
        _log_failure(request_id, "TOKEN_EXPIRED", alg="HS256", kid=kid)
        raise JwtAuthError("TOKEN_EXPIRED", "Token has expired")
    except pyjwt.InvalidSignatureError:
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="HS256", kid=kid)
        raise JwtAuthError("TOKEN_INVALID_SIGNATURE", "Invalid HS256 signature")
    except pyjwt.DecodeError:
        _log_failure(request_id, "TOKEN_MALFORMED", alg="HS256", kid=kid)
        raise JwtAuthError("TOKEN_MALFORMED", "Token could not be decoded")
    except pyjwt.InvalidTokenError:
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="HS256", kid=kid)
        raise JwtAuthError("TOKEN_INVALID_SIGNATURE", "Invalid token")


def _verify_rs256(
    token: str,
    allow_expired: bool,
    request_id: Optional[str],
    kid: Optional[str],
) -> dict:
    """Verify an RS256-signed token using the public key identified by kid."""
    if not kid:
        _log_failure(request_id, "TOKEN_MALFORMED", alg="RS256", kid=None)
        raise JwtAuthError("TOKEN_MALFORMED", "RS256 token missing kid header")

    public_key = get_verification_key(kid)
    if public_key is None:
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="RS256", kid=kid)
        raise JwtAuthError(
            "TOKEN_INVALID_SIGNATURE",
            f"No public key found for kid={kid}"
        )

    try:
        options = {
            "verify_exp": not allow_expired,
            "verify_iss": True,
            "verify_aud": True,
        }
        payload = pyjwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options=options,
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        if allow_expired:
            return pyjwt.decode(
                token, public_key, algorithms=["RS256"],
                options={"verify_exp": False, "verify_iss": False, "verify_aud": False}
            )
        _log_failure(request_id, "TOKEN_EXPIRED", alg="RS256", kid=kid)
        raise JwtAuthError("TOKEN_EXPIRED", "Token has expired")
    except pyjwt.InvalidSignatureError:
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="RS256", kid=kid)
        raise JwtAuthError("TOKEN_INVALID_SIGNATURE", "Invalid RS256 signature")
    except (pyjwt.InvalidIssuerError, pyjwt.InvalidAudienceError):
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="RS256", kid=kid)
        raise JwtAuthError("TOKEN_INVALID_SIGNATURE", "Invalid issuer or audience")
    except pyjwt.DecodeError:
        _log_failure(request_id, "TOKEN_MALFORMED", alg="RS256", kid=kid)
        raise JwtAuthError("TOKEN_MALFORMED", "Token could not be decoded")
    except pyjwt.InvalidTokenError:
        _log_failure(request_id, "TOKEN_INVALID_SIGNATURE", alg="RS256", kid=kid)
        raise JwtAuthError("TOKEN_INVALID_SIGNATURE", "Invalid token")


def _log_failure(
    request_id: Optional[str],
    code: str,
    alg: Optional[str],
    kid: Optional[str],
) -> None:
    """Structured observability log for auth failures. No secrets, no PII."""
    logger.warning(
        "jwt_auth_failure",
        extra={
            "request_id": request_id or "unknown",
            "auth_error_code": code,
            "alg": alg or "unknown",
            "kid": kid or "none",
        },
    )
