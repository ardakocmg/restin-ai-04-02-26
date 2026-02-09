"""
🖼️ Media Processing Service — Rule 24
Auto-convert uploads to WebP/AVIF for optimal storage.
Tracks storage usage per tenant for billing (Pillar 0).
"""
from PIL import Image
import io
import os
from typing import Optional, Tuple
from datetime import datetime, timezone


# Quality settings
WEBP_QUALITY = 80
AVIF_QUALITY = 65  # AVIF is more efficient, can use lower quality
MAX_DIMENSION = 2048  # Max width/height in pixels
THUMBNAIL_SIZE = (300, 300)


def convert_to_webp(image_bytes: bytes, quality: int = WEBP_QUALITY) -> Tuple[bytes, dict]:
    """
    Convert any image to WebP format.
    Returns (webp_bytes, metadata).
    """
    img = Image.open(io.BytesIO(image_bytes))
    original_format = img.format or "UNKNOWN"
    original_size = len(image_bytes)

    # Resize if too large
    img = _constrain_dimensions(img, MAX_DIMENSION)

    # Convert RGBA to RGB if needed (WebP supports both)
    if img.mode == "RGBA":
        pass  # WebP supports transparency
    elif img.mode != "RGB":
        img = img.convert("RGB")

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=4)
    webp_bytes = output.getvalue()

    return webp_bytes, {
        "original_format": original_format,
        "original_size_bytes": original_size,
        "converted_size_bytes": len(webp_bytes),
        "savings_percent": round((1 - len(webp_bytes) / original_size) * 100, 1) if original_size > 0 else 0,
        "width": img.width,
        "height": img.height,
        "format": "webp",
    }


def generate_thumbnail(image_bytes: bytes, size: Tuple[int, int] = THUMBNAIL_SIZE) -> bytes:
    """Generate a thumbnail WebP image."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    img.thumbnail(size, Image.Resampling.LANCZOS)

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=70)
    return output.getvalue()


def _constrain_dimensions(img: Image.Image, max_dim: int) -> Image.Image:
    """Resize image if either dimension exceeds max_dim."""
    if img.width <= max_dim and img.height <= max_dim:
        return img
    ratio = min(max_dim / img.width, max_dim / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))
    return img.resize(new_size, Image.Resampling.LANCZOS)


async def track_storage_usage(db, tenant_id: str, venue_id: str, file_size_bytes: int, file_type: str = "image"):
    """
    Track storage usage per tenant for billing.
    Updates the cumulative storage counter.
    """
    await db["storage_billing"].update_one(
        {"tenant_id": tenant_id},
        {
            "$inc": {
                "total_media_size_bytes": file_size_bytes,
                f"by_type.{file_type}": file_size_bytes,
                "file_count": 1,
            },
            "$set": {
                "venue_id": venue_id,
                "last_upload_at": datetime.now(timezone.utc).isoformat(),
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        },
        upsert=True,
    )


async def get_storage_usage(db, tenant_id: str) -> dict:
    """Get storage usage summary for billing."""
    doc = await db["storage_billing"].find_one({"tenant_id": tenant_id})
    if not doc:
        return {
            "total_media_size_bytes": 0,
            "total_media_size_mb": 0,
            "file_count": 0,
            "by_type": {},
        }

    total_bytes = doc.get("total_media_size_bytes", 0)
    return {
        "total_media_size_bytes": total_bytes,
        "total_media_size_mb": round(total_bytes / (1024 * 1024), 2),
        "file_count": doc.get("file_count", 0),
        "by_type": doc.get("by_type", {}),
        "last_upload_at": doc.get("last_upload_at"),
    }
