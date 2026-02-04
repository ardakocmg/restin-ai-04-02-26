import os
import json
import base64
import logging
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

logger = logging.getLogger(__name__)

class EnvelopeCrypto:
    @staticmethod
    def _derive_key(context: str, salt: bytes = None) -> bytes:
        if salt is None:
            # Dynamic salt generation is preferred, but for this architecture we use a derived salt or random
            # For reconstruction, we need deterministic derivation from the Master Seed based on context
            # HKDF allows us to derive a specific sub-key for this context.
            salt = b"malta_hr_static_salt" 
        
        try:
            hkdf = HKDF(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                info=context.encode(),
            )
            # We strictly use the MASTER_SEED provided in configuration
            return hkdf.derive(bytes.fromhex(settings.MASTER_SEED))
        except Exception as e:
            logger.error(f"Crypto Key Derivation Failed: {e}")
            raise ValueError("Crypto Configuration Error")

    @classmethod
    def encrypt(cls, data: dict, context: str = "tenant_default") -> dict:
        try:
            dek = AESGCM.generate_key(bit_length=256)
            aesgcm = AESGCM(dek)
            nonce = os.urandom(12)
            payload = json.dumps(data).encode()
            ciphertext = aesgcm.encrypt(nonce, payload, None)
            
            kek = cls._derive_key(context)
            kek_gcm = AESGCM(kek)
            kek_nonce = os.urandom(12)
            wrapped_dek = kek_gcm.encrypt(kek_nonce, dek, None)

            return {
                "v": 1,
                "alg": "AES-256-GCM",
                "ctx": context,
                "kek_iv": base64.b64encode(kek_nonce).decode(),
                "dek_wrapped": base64.b64encode(wrapped_dek).decode(),
                "payload_iv": base64.b64encode(nonce).decode(),
                "ciphertext": base64.b64encode(ciphertext).decode()
            }
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise RuntimeError("Encryption Service Failure")

    @classmethod
    def decrypt(cls, envelope: dict) -> dict:
        try:
            context = envelope.get("ctx", "tenant_default")
            kek = cls._derive_key(context)
            kek_gcm = AESGCM(kek)

            kek_iv = base64.b64decode(envelope["kek_iv"])
            dek_wrapped = base64.b64decode(envelope["dek_wrapped"])
            dek = kek_gcm.decrypt(kek_iv, dek_wrapped, None)

            aesgcm = AESGCM(dek)
            payload_iv = base64.b64decode(envelope["payload_iv"])
            ciphertext = base64.b64decode(envelope["ciphertext"])
            plaintext = aesgcm.decrypt(payload_iv, ciphertext, None)

            return json.loads(plaintext)
        except Exception as e:
            logger.warning(f"Decryption integrity check failed for context {envelope.get('ctx')}")
            raise ValueError("Decryption Failed: Integrity check failed.")
