"""
JWT Authentication Module — HS256 ↔ RS256 Migration Bridge.

Supports dual-verify (both HS256 and RS256 tokens accepted),
switchable signing (HS256_ONLY or RS256_ONLY via env flag),
JWKS endpoint, and key rotation via KID.
"""
