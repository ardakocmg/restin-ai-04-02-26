"""
JWKS Endpoint — Publishes RS256 public keys for external verification.

GET /api/auth/.well-known/jwks.json
No auth required.
Cache-Control: public, max-age=300
"""
import base64
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.auth.jwt_keys import get_all_public_keys

logger = logging.getLogger("jwt.jwks")

jwks_router = APIRouter(tags=["auth"])


def _int_to_base64url(n: int) -> str:
    """Convert a Python int to Base64url-encoded string (no padding)."""
    byte_length = (n.bit_length() + 7) // 8
    n_bytes = n.to_bytes(byte_length, byteorder="big")
    return base64.urlsafe_b64encode(n_bytes).rstrip(b"=").decode("ascii")


@jwks_router.get("/auth/.well-known/jwks.json")
async def get_jwks() -> JSONResponse:
    """
    Return JWKS containing all loaded RS256 public keys.
    Standard format for OpenID Connect / JWT verification.
    """
    keys_dict = get_all_public_keys()
    jwks_keys = []

    for kid, pub_key in keys_dict.items():
        # Extract RSA public numbers
        pub_numbers = pub_key.public_numbers()
        jwks_keys.append({
            "kid": kid,
            "kty": "RSA",
            "alg": "RS256",
            "use": "sig",
            "n": _int_to_base64url(pub_numbers.n),
            "e": _int_to_base64url(pub_numbers.e),
        })

    logger.debug("JWKS requested, returning %d keys", len(jwks_keys))

    return JSONResponse(
        content={"keys": jwks_keys},
        headers={
            "Cache-Control": "public, max-age=300",
        },
    )
