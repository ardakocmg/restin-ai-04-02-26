"""
Shared Document Service - Unified Upload for All Modules
Server-authoritative, hash-based idempotency, audit-safe
"""
import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional
from fastapi import UploadFile
from pymongo.database import Database

ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

def hash_file(content: bytes) -> str:
    """Generate SHA256 hash for idempotency"""
    return hashlib.sha256(content).hexdigest()

async def save_document(
    db: Database,
    *,
    venue_id: str,
    user_id: str,
    module: str,  # HR | INVENTORY | FINANCE | CRM | REPORTING | POS | KDS
    file: UploadFile,
    ocr_text: Optional[str] = None,
    ensure_ids = None
):
    """Save document with idempotency and OCR"""
    if file.content_type not in ALLOWED_MIME:
        raise ValueError("UNSUPPORTED_FILE_TYPE")

    content = await file.read()
    file_hash = hash_file(content)

    # Check if already uploaded (idempotent)
    existing = await db.documents.find_one(
        {"venue_id": venue_id, "hash": file_hash},
        {"_id": 0}
    )
    if existing:
        return existing

    doc_id = str(uuid.uuid4())
    from core.config import ROOT_DIR
    upload_dir = os.path.join(ROOT_DIR, "data", "uploads", venue_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/{doc_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    document = {
        "id": doc_id,
        "venue_id": venue_id,
        "module": module,
        "filename": file.filename,
        "mime": file.content_type,
        "size": len(content),
        "hash": file_hash,
        "file_path": file_path,
        "ocr_text": ocr_text,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Generate display_id if ensure_ids available
    if ensure_ids:
        try:
            document = await ensure_ids(db, "DOCUMENT", document, venue_id)
        except:
            document["display_id"] = f"DOC-{doc_id[:8].upper()}"
    else:
        document["display_id"] = f"DOC-{doc_id[:8].upper()}"

    await db.documents.insert_one(document)
    return document
