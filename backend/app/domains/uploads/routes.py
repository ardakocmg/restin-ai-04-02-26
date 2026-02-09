"""
File upload routes - handles media uploads to Cloudflare R2.
Supports menu images, documents, receipts, and general file uploads.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional
from app.services.storage import upload_file, delete_file, list_files
from app.core.database import get_database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # xlsx
    "application/vnd.ms-excel",  # xls
    "text/csv",
}


@router.post("")
async def upload_media(
    file: UploadFile = File(...),
    folder: str = Form("uploads"),
    venue_id: Optional[str] = Form(None),
):
    """
    Upload a file to R2 storage.
    Folders: menu-images, receipts, documents, staff-photos, uploads
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type '{file.content_type}' not allowed. Supported: JPEG, PNG, WebP, PDF, Excel, CSV")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")

    # Upload to R2
    try:
        result = await upload_file(
            file_content=content,
            filename=file.filename or "unnamed",
            content_type=file.content_type or "application/octet-stream",
            folder=folder,
            venue_id=venue_id,
        )
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    # Save metadata to MongoDB
    db = get_database()
    await db.media_assets.insert_one({
        "url": result["url"],
        "key": result["key"],
        "filename": result["filename"],
        "content_type": result["content_type"],
        "size": result["size"],
        "folder": folder,
        "venue_id": venue_id,
        "uploaded_at": result["uploaded_at"],
    })

    return result


@router.get("")
async def list_media(
    folder: Optional[str] = Query(None),
    venue_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """List uploaded media files from MongoDB."""
    db = get_database()
    query = {}
    if folder:
        query["folder"] = folder
    if venue_id:
        query["venue_id"] = venue_id

    assets = await db.media_assets.find(query).sort("uploaded_at", -1).to_list(length=limit)
    for a in assets:
        a["_id"] = str(a["_id"])
    return assets


@router.delete("/{file_key:path}")
async def delete_media(file_key: str):
    """Delete a file from R2 and remove its metadata."""
    # Delete from R2
    success = await delete_file(file_key)
    if not success:
        raise HTTPException(500, "Failed to delete file from storage")

    # Remove from MongoDB
    db = get_database()
    await db.media_assets.delete_one({"key": file_key})

    return {"status": "deleted", "key": file_key}
