"""
PII Field-Level Encryption
Provides AES-GCM encryption for sensitive data (e.g. Payroll info, Payment Tokens, API Secrets).
Requires `cryptography` package.
"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# In production this must be retrieved securely from Vault or ENV, MUST be 32 bytes (256-bit)
# For this enterprise maturity audit, we generate a stable local key if not present.
ENCRYPTION_KEY_B64 = os.environ.get("PII_ENCRYPTION_KEY", "")

if not ENCRYPTION_KEY_B64:
    # 32 bytes for AES-256
    _raw_key = b"restin_ai_secret_key_32_bytes!!!"
    ENCRYPTION_KEY_B64 = base64.b64encode(_raw_key).decode('utf-8')

class PIIEncryptionService:
    def __init__(self):
        try:
            self._key = base64.b64decode(ENCRYPTION_KEY_B64)
            if len(self._key) not in (16, 24, 32):
                raise ValueError("AES-GCM key must be 16, 24, or 32 bytes")
            self._aesgcm = AESGCM(self._key)
        except Exception as e:
            print(f"⚠️ [Security] Failed to initialize PII Encryption: {e}")
            self._aesgcm = None

    def _generate_nonce(self) -> bytes:
        """Generate a random 12-byte nonce (IV) for AES-GCM."""
        return os.urandom(12)

    def encrypt(self, plain_text: str) -> str:
        """
        Encrypt a string using AES-GCM.
        Returns a base64 encoded string format: "enc_v1:{nonce_b64}:{ciphertext_b64}"
        """
        if not self._aesgcm or not plain_text:
            return plain_text # Fallback if misconfigured
            
        try:
            nonce = self._generate_nonce()
            ciphertext = self._aesgcm.encrypt(nonce, plain_text.encode('utf-8'), None)
            
            nonce_b64 = base64.b64encode(nonce).decode('utf-8')
            ct_b64 = base64.b64encode(ciphertext).decode('utf-8')
            
            return f"enc_v1:{nonce_b64}:{ct_b64}"
        except Exception as e:
            print(f"Encryption failed: {e}")
            return plain_text

    def decrypt(self, encrypted_string: str) -> str:
        """
        Decrypt a previously encrypted string.
        Expects format: "enc_v1:{nonce_b64}:{ciphertext_b64}"
        """
        if not self._aesgcm or not encrypted_string or not encrypted_string.startswith("enc_v1:"):
            return encrypted_string # Not encrypted or misconfigured
            
        try:
            parts = encrypted_string.split(":")
            if len(parts) != 3:
                return encrypted_string
                
            nonce = base64.b64decode(parts[1])
            ciphertext = base64.b64decode(parts[2])
            
            decrypted = self._aesgcm.decrypt(nonce, ciphertext, None)
            return decrypted.decode('utf-8')
        except Exception as e:
            print(f"Decryption failed: {e}")
            return encrypted_string # Return raw string if decipher fails (e.g. key rotation mismatch)

pii_encryption_service = PIIEncryptionService()

def encrypt_sensitive_dict(data: dict, sensitive_fields: list) -> dict:
    """Recursively encrypt specific fields in a dictionary."""
    if not data or not isinstance(data, dict):
        return data
        
    result = data.copy()
    for k, v in result.items():
        if k in sensitive_fields and isinstance(v, str):
            result[k] = pii_encryption_service.encrypt(v)
        elif isinstance(v, dict):
            result[k] = encrypt_sensitive_dict(v, sensitive_fields)
        elif isinstance(v, list):
            result[k] = [encrypt_sensitive_dict(item, sensitive_fields) if isinstance(item, dict) else item for item in v]
            
    return result

def decrypt_sensitive_dict(data: dict, sensitive_fields: list) -> dict:
    """Recursively decrypt specific fields in a dictionary."""
    if not data or not isinstance(data, dict):
        return data
        
    result = data.copy()
    for k, v in result.items():
        if k in sensitive_fields and isinstance(v, str):
            result[k] = pii_encryption_service.decrypt(v)
        elif isinstance(v, dict):
            result[k] = decrypt_sensitive_dict(v, sensitive_fields)
        elif isinstance(v, list):
            result[k] = [decrypt_sensitive_dict(item, sensitive_fields) if isinstance(item, dict) else item for item in v]
            
    return result
