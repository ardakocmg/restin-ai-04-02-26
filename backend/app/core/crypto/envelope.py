import os
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from backend.app.core.config import settings

class EnvelopeCrypto:
    def __init__(self):
        # Master Key from Environment
        self.master_key = settings.MASTER_SEED.encode()

    def _derive_dek(self, context: bytes) -> bytes:
        """Derive a Data Encryption Key (DEK) using HKDF."""
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=context,
        )
        return hkdf.derive(self.master_key)

    def encrypt_data(self, data: dict, user_id: str) -> dict:
        """Encrypts a dictionary into an envelope."""
        # 1. Generate DEK specifically for this user context
        dek = self._derive_dek(user_id.encode())
        aesgcm = AESGCM(dek)
        
        # 2. Serialize Data
        payload = json.dumps(data).encode()
        
        # 3. Encrypt (Nonce is auto-generated usually, but here we invoke it explicitly)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, payload, None)
        
        # 4. Construct Envelope
        return {
            "v": 1,  # Key Version
            "algo": "AES-GCM",
            "nonce": base64.b64encode(nonce).decode(),
            "blob": base64.b64encode(ciphertext).decode()
        }

    def decrypt_data(self, envelope: dict, user_id: str) -> dict:
        """Decrypts an envelope back to a dictionary."""
        # 1. Re-derive DEK
        dek = self._derive_dek(user_id.encode())
        aesgcm = AESGCM(dek)
        
        # 2. Decode Components
        nonce = base64.b64decode(envelope["nonce"])
        ciphertext = base64.b64decode(envelope["blob"])
        
        # 3. Decrypt
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode())

crypto = EnvelopeCrypto()
