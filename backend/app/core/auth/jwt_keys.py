"""
JWT Key Management — PEM loading, key store, rotation support.

Keys are loaded once at module import (server startup).
Supports reading PEM from env var or file path.
Normalizes escaped newlines for Render/Docker env injection.
"""
import json
import logging
from pathlib import Path
from typing import Optional

from cryptography.hazmat.primitives.serialization import (
    load_pem_private_key,
    load_pem_public_key,
)
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey

from .jwt_config import (
    ACTIVE_KID,
    RS256_PRIVATE_KEY_RAW,
    RS256_PUBLIC_KEYS_RAW,
    SIGNING_MODE,
    SigningMode,
)

logger = logging.getLogger("jwt.keys")


# ── Internal key stores ──────────────────────────────────────────────

_private_key: Optional[RSAPrivateKey] = None
_public_keys: dict[str, RSAPublicKey] = {}


def _normalize_pem(raw: str) -> str:
    """
    Render/Docker env vars often have literal \\n instead of real newlines.
    Also handle base64 blobs without headers.
    """
    return raw.replace("\\n", "\n").strip()


def _load_pem_string_or_file(raw: str) -> bytes:
    """
    If raw starts with '-----BEGIN', treat as inline PEM.
    If raw starts with '@' or '/', treat as file path.
    Otherwise try inline first.
    """
    normalized = _normalize_pem(raw)

    if normalized.startswith("-----BEGIN"):
        return normalized.encode("utf-8")

    # Try as file path
    path = Path(normalized.lstrip("@"))
    if path.is_file():
        return path.read_bytes()

    # Last resort: treat as inline
    return normalized.encode("utf-8")


def _load_keys() -> None:
    """Load RSA keys from env/files into module-level stores."""
    global _private_key, _public_keys

    if SIGNING_MODE != SigningMode.RS256_ONLY:
        return  # No RS256 keys needed

    # Load private key
    if RS256_PRIVATE_KEY_RAW:
        try:
            pem_bytes = _load_pem_string_or_file(RS256_PRIVATE_KEY_RAW)
            _private_key = load_pem_private_key(pem_bytes, password=None)
            if not isinstance(_private_key, RSAPrivateKey):
                raise TypeError("Private key is not RSA")
            logger.info("RS256 private key loaded (kid=%s)", ACTIVE_KID)
        except Exception as exc:
            raise RuntimeError(f"Failed to load RS256 private key: {exc}") from exc

    # Load public keys (JSON map: {"kid": "PEM..."})
    if RS256_PUBLIC_KEYS_RAW:
        try:
            raw_map: dict[str, str] = json.loads(
                _normalize_pem(RS256_PUBLIC_KEYS_RAW)
            )
            for kid, pem_raw in raw_map.items():
                pem_bytes = _load_pem_string_or_file(pem_raw)
                pub = load_pem_public_key(pem_bytes)
                if not isinstance(pub, RSAPublicKey):
                    raise TypeError(f"Public key for kid={kid} is not RSA")
                _public_keys[kid] = pub
            logger.info("RS256 public keys loaded: kids=%s", list(_public_keys.keys()))
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"AUTH_JWT_RS256_PUBLIC_KEYS is not valid JSON: {exc}"
            ) from exc


# ── Public API ───────────────────────────────────────────────────────

def get_signing_key() -> tuple[str, RSAPrivateKey]:
    """Return (kid, private_key) for signing RS256 tokens."""
    if _private_key is None:
        raise RuntimeError("RS256 private key not loaded. Check AUTH_JWT_RS256_PRIVATE_KEY_PEM.")
    return ACTIVE_KID, _private_key


def get_verification_key(kid: str) -> Optional[RSAPublicKey]:
    """Return public key for a given kid, or None if not found."""
    return _public_keys.get(kid)


def get_all_public_keys() -> dict[str, RSAPublicKey]:
    """Return all loaded public keys (for JWKS endpoint)."""
    return dict(_public_keys)


# ── Auto-load on import ─────────────────────────────────────────────
_load_keys()
