"""
Unit tests for JWT HS256 → RS256 Migration.

Tests cover:
  1. HS256 token verifies OK
  2. RS256 token verifies OK
  3. Wrong HS256 signature → TOKEN_INVALID_SIGNATURE
  4. Wrong RS256 kid → TOKEN_INVALID_SIGNATURE
  5. Expired → TOKEN_EXPIRED
  6. Missing → TOKEN_MISSING
  7. Malformed → TOKEN_MALFORMED

Run: python -m pytest tests/test_jwt_migration.py -v
"""
import os
import sys
import json
import time

# ── Must set env BEFORE importing auth modules ─────────────────────
# Use a test-only HS256 secret (>= 16 chars)
os.environ["JWT_SECRET"] = "test-secret-key-restin-ai-32char!"
os.environ["AUTH_JWT_SIGNING_MODE"] = "HS256_ONLY"
os.environ["AUTH_JWT_ISSUER"] = "restin.ai"
os.environ["AUTH_JWT_AUDIENCE"] = "restin.ai"

# Add backend root to path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import jwt as pyjwt
import pytest
from datetime import datetime, timezone, timedelta

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


# ── Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def hs256_secret():
    return os.environ["JWT_SECRET"]


@pytest.fixture
def rsa_keypair():
    """Generate a fresh RSA keypair for testing."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    return private_key, public_key, private_pem, public_pem


@pytest.fixture
def sample_payload():
    now = datetime.now(timezone.utc)
    return {
        "user_id": "test_user_1",
        "venue_id": "venue_1",
        "role": "OWNER",
        "device_id": "test_device",
        "iss": "restin.ai",
        "aud": "restin.ai",
        "iat": now,
        "exp": now + timedelta(hours=12),
    }


@pytest.fixture
def expired_payload():
    now = datetime.now(timezone.utc)
    return {
        "user_id": "test_user_1",
        "venue_id": "venue_1",
        "role": "OWNER",
        "device_id": "test_device",
        "iss": "restin.ai",
        "aud": "restin.ai",
        "iat": now - timedelta(hours=24),
        "exp": now - timedelta(hours=12),
    }


# ── Test 1: HS256 token verifies OK ─────────────────────────────────

def test_hs256_verify_ok(hs256_secret, sample_payload):
    """A valid HS256 token should verify successfully."""
    token = pyjwt.encode(sample_payload, hs256_secret, algorithm="HS256")

    from app.core.auth.jwt_verify import verify_jwt
    payload = verify_jwt(token)
    assert payload["user_id"] == "test_user_1"
    assert payload["venue_id"] == "venue_1"
    assert payload["role"] == "OWNER"


# ── Test 2: RS256 token verifies OK ─────────────────────────────────

def test_rs256_verify_ok(rsa_keypair, sample_payload):
    """A valid RS256 token with matching kid should verify."""
    private_key, public_key, _, _ = rsa_keypair
    kid = "test-key-1"

    token = pyjwt.encode(
        sample_payload,
        private_key,
        algorithm="RS256",
        headers={"kid": kid},
    )

    # Inject the public key into the key store
    from app.core.auth import jwt_keys
    jwt_keys._public_keys[kid] = public_key

    try:
        from app.core.auth.jwt_verify import verify_jwt
        payload = verify_jwt(token)
        assert payload["user_id"] == "test_user_1"
        assert payload["role"] == "OWNER"
    finally:
        # Clean up
        jwt_keys._public_keys.pop(kid, None)


# ── Test 3: Wrong HS256 signature → TOKEN_INVALID_SIGNATURE ─────────

def test_hs256_wrong_signature(sample_payload):
    """Token signed with wrong secret should fail with TOKEN_INVALID_SIGNATURE."""
    wrong_secret = "wrong-secret-key-99999999"
    token = pyjwt.encode(sample_payload, wrong_secret, algorithm="HS256")

    from app.core.auth.jwt_verify import verify_jwt, JwtAuthError
    with pytest.raises(JwtAuthError) as exc_info:
        verify_jwt(token)
    assert exc_info.value.code == "TOKEN_INVALID_SIGNATURE"


# ── Test 4: Wrong RS256 kid → TOKEN_INVALID_SIGNATURE ───────────────

def test_rs256_wrong_kid(rsa_keypair, sample_payload):
    """RS256 token with unknown kid should fail with TOKEN_INVALID_SIGNATURE."""
    private_key, _, _, _ = rsa_keypair
    token = pyjwt.encode(
        sample_payload,
        private_key,
        algorithm="RS256",
        headers={"kid": "nonexistent-kid"},
    )

    from app.core.auth.jwt_verify import verify_jwt, JwtAuthError
    with pytest.raises(JwtAuthError) as exc_info:
        verify_jwt(token)
    assert exc_info.value.code == "TOKEN_INVALID_SIGNATURE"


# ── Test 5: Expired → TOKEN_EXPIRED ─────────────────────────────────

def test_expired_token(hs256_secret, expired_payload):
    """Expired token should fail with TOKEN_EXPIRED."""
    token = pyjwt.encode(expired_payload, hs256_secret, algorithm="HS256")

    from app.core.auth.jwt_verify import verify_jwt, JwtAuthError
    with pytest.raises(JwtAuthError) as exc_info:
        verify_jwt(token)
    assert exc_info.value.code == "TOKEN_EXPIRED"


# ── Test 6: Missing → TOKEN_MISSING ─────────────────────────────────

def test_missing_token():
    """None/empty token should fail with TOKEN_MISSING."""
    from app.core.auth.jwt_verify import verify_jwt, JwtAuthError

    with pytest.raises(JwtAuthError) as exc_info:
        verify_jwt(None)
    assert exc_info.value.code == "TOKEN_MISSING"

    with pytest.raises(JwtAuthError) as exc_info:
        verify_jwt("")
    assert exc_info.value.code == "TOKEN_MISSING"


# ── Test 7: Malformed → TOKEN_MALFORMED ──────────────────────────────

def test_malformed_token():
    """Garbage string should fail with TOKEN_MALFORMED."""
    from app.core.auth.jwt_verify import verify_jwt, JwtAuthError

    with pytest.raises(JwtAuthError) as exc_info:
        verify_jwt("not.a.valid.jwt.at.all")
    assert exc_info.value.code == "TOKEN_MALFORMED"


# ── Test 8: allow_expired=True returns payload ──────────────────────

def test_allow_expired(hs256_secret, expired_payload):
    """allow_expired=True should return the payload even if token is expired."""
    token = pyjwt.encode(expired_payload, hs256_secret, algorithm="HS256")

    from app.core.auth.jwt_verify import verify_jwt
    payload = verify_jwt(token, allow_expired=True)
    assert payload["user_id"] == "test_user_1"


# ── Test 9: sign_access_token produces verifiable HS256 token ────────

def test_sign_access_token_hs256():
    """sign_access_token in HS256_ONLY mode should produce a valid HS256 token."""
    from app.core.auth.jwt_sign import sign_access_token
    from app.core.auth.jwt_verify import verify_jwt

    token = sign_access_token(
        user_id="sign_test_user",
        venue_id="venue_2",
        role="STAFF",
        device_id="dev_123",
    )

    # The token should be verifiable
    payload = verify_jwt(token)
    assert payload["user_id"] == "sign_test_user"
    assert payload["venue_id"] == "venue_2"
    assert payload["role"] == "STAFF"
    assert payload["iss"] == "restin.ai"
    assert payload["aud"] == "restin.ai"


# ── Test 10: Backward-compatible security.py bridge ──────────────────

def test_backward_compatible_bridge():
    """
    create_jwt_token / verify_jwt_token from core.security
    should still work identically (backward compatibility).
    """
    from core.security import create_jwt_token, verify_jwt_token

    token = create_jwt_token(
        user_id="bridge_user",
        venue_id="venue_3",
        role="MANAGER",
        device_id="bridge_dev",
    )

    payload = verify_jwt_token(token)
    assert payload is not None
    assert payload["user_id"] == "bridge_user"
    assert payload["role"] == "MANAGER"
