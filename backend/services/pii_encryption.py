"""
🔐 PII Encryption Service — Rule 21
Encrypt sensitive columns (PII) using Fernet symmetric encryption.
Zero-Trust: Row Level Security (RLS) mandatory.
"""
from cryptography.fernet import Fernet
from typing import Optional
import os
import base64
import hashlib
import logging

logger = logging.getLogger(__name__)

# Derive key from env or generate one
_ENCRYPTION_KEY = os.getenv("PII_ENCRYPTION_KEY")
if _ENCRYPTION_KEY:
    # Ensure it's a valid Fernet key (32 bytes base64)
    key = _ENCRYPTION_KEY.encode()
else:
    # Fallback for dev — deterministic from a secret
    secret = os.getenv("SECRET_KEY", "restin-ai-dev-secret-key-change-me")
    if secret == "restin-ai-dev-secret-key-change-me":
        logger.warning("⚠️  PII_ENCRYPTION_KEY and SECRET_KEY not set — using INSECURE dev fallback!")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())

_fernet = Fernet(key)


def encrypt_pii(plaintext: str) -> str:
    """Encrypt a PII string field. Returns base64-encoded ciphertext."""
    if not plaintext:
        return plaintext
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_pii(ciphertext: str) -> str:
    """Decrypt a PII string field. Returns plaintext."""
    if not ciphertext:
        return ciphertext
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except Exception:
        # If decryption fails, return masked value
        return "***ENCRYPTED***"


def mask_pii(value: str, visible_chars: int = 4) -> str:
    """
    Mask PII for display (e.g., in logs).
    'john@example.com' → 'john****'
    '+35679123456' → '+356****'
    """
    if not value or len(value) <= visible_chars:
        return "****"
    return value[:visible_chars] + "****"


def hash_pii(value: str) -> str:
    """
    One-way hash for PII lookup (e.g., search by email without storing plaintext).
    Uses SHA-256 with a salt.
    """
    salt = os.getenv("PII_HASH_SALT", "restin-pii-salt")
    if salt == "restin-pii-salt":
        logger.warning("⚠️  PII_HASH_SALT not set — using INSECURE dev fallback!")
    return hashlib.sha256(f"{salt}:{value}".encode()).hexdigest()


# Field-level encryption helpers for MongoDB documents
PII_FIELDS = {"email", "phone", "id_card", "bank_account", "tax_id", "address", "full_name"}


def encrypt_document_pii(doc: dict, fields: Optional[set] = None) -> dict:
    """Encrypt PII fields in a document before storing."""
    target_fields = fields or PII_FIELDS
    result = dict(doc)
    for field in target_fields:
        if field in result and result[field] and isinstance(result[field], str):
            result[f"_{field}_hash"] = hash_pii(result[field])
            result[field] = encrypt_pii(result[field])
    return result


def decrypt_document_pii(doc: dict, fields: Optional[set] = None) -> dict:
    """Decrypt PII fields in a document after reading."""
    target_fields = fields or PII_FIELDS
    result = dict(doc)
    for field in target_fields:
        if field in result and result[field] and isinstance(result[field], str):
            result[field] = decrypt_pii(result[field])
    return result
