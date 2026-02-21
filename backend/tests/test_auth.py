"""
Tests for authentication and security middleware.
"""

import pytest
import jwt
import time


class TestJWTTokenValidation:
    """Test JWT token creation and validation logic."""

    SECRET = "test-secret-key"

    def test_valid_token_structure(self):
        """A properly structured JWT should decode without error."""
        payload = {
            "user_id": "user_123",
            "venue_id": "venue_456",
            "role": "manager",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        token = jwt.encode(payload, self.SECRET, algorithm="HS256")
        decoded = jwt.decode(token, self.SECRET, algorithms=["HS256"])
        assert decoded["user_id"] == "user_123"
        assert decoded["venue_id"] == "venue_456"
        assert decoded["role"] == "manager"

    def test_expired_token_raises(self):
        """Expired tokens should raise an error."""
        payload = {
            "user_id": "user_123",
            "exp": int(time.time()) - 100,  # Already expired
        }
        token = jwt.encode(payload, self.SECRET, algorithm="HS256")
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, self.SECRET, algorithms=["HS256"])

    def test_invalid_secret_raises(self):
        """Tokens signed with wrong secret should fail."""
        payload = {"user_id": "user_123", "exp": int(time.time()) + 3600}
        token = jwt.encode(payload, "correct-secret", algorithm="HS256")
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, "wrong-secret", algorithms=["HS256"])

    def test_missing_claims(self):
        """Token without required claims should still decode (validation is app-level)."""
        payload = {"exp": int(time.time()) + 3600}
        token = jwt.encode(payload, self.SECRET, algorithm="HS256")
        decoded = jwt.decode(token, self.SECRET, algorithms=["HS256"])
        assert "user_id" not in decoded
