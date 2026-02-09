"""
Cloudflare R2 Storage Service - S3-compatible file storage.
Uses boto3 with R2 endpoint for menu images, documents, receipts etc.
"""
import boto3
import os
import uuid
import logging
from datetime import datetime
from typing import Optional
from botocore.config import Config

logger = logging.getLogger(__name__)

# R2 Configuration from environment
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "restin-media")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")  # Custom domain or R2.dev URL

R2_ENDPOINT = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else ""


def get_r2_client():
    """Create and return a boto3 S3 client configured for Cloudflare R2."""
    if not R2_ACCOUNT_ID or not R2_ACCESS_KEY or not R2_SECRET_KEY:
        logger.warning("R2 credentials not configured. File uploads will fail.")
        return None

    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "adaptive"},
        ),
        region_name="auto",
    )


def generate_file_key(folder: str, filename: str, venue_id: Optional[str] = None) -> str:
    """Generate a unique file key for R2 storage."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    unique_id = uuid.uuid4().hex[:12]
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    
    if venue_id:
        return f"{venue_id}/{folder}/{timestamp}_{unique_id}.{ext}"
    return f"global/{folder}/{timestamp}_{unique_id}.{ext}"


async def upload_file(
    file_content: bytes,
    filename: str,
    content_type: str,
    folder: str = "uploads",
    venue_id: Optional[str] = None,
) -> dict:
    """
    Upload a file to Cloudflare R2.
    Returns dict with url, key, size, and content_type.
    """
    client = get_r2_client()
    if not client:
        raise RuntimeError("R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY.")
    
    file_key = generate_file_key(folder, filename, venue_id)
    
    try:
        client.put_object(
            Bucket=R2_BUCKET,
            Key=file_key,
            Body=file_content,
            ContentType=content_type,
        )
        
        # Build public URL
        if R2_PUBLIC_URL:
            public_url = f"{R2_PUBLIC_URL.rstrip('/')}/{file_key}"
        else:
            public_url = f"{R2_ENDPOINT}/{R2_BUCKET}/{file_key}"
        
        logger.info(f"File uploaded: {file_key} ({len(file_content)} bytes)")
        
        return {
            "url": public_url,
            "key": file_key,
            "size": len(file_content),
            "content_type": content_type,
            "filename": filename,
            "uploaded_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"R2 upload failed: {e}")
        raise RuntimeError(f"File upload failed: {str(e)}")


async def delete_file(file_key: str) -> bool:
    """Delete a file from R2 by its key."""
    client = get_r2_client()
    if not client:
        return False
    
    try:
        client.delete_object(Bucket=R2_BUCKET, Key=file_key)
        logger.info(f"File deleted: {file_key}")
        return True
    except Exception as e:
        logger.error(f"R2 delete failed: {e}")
        return False


async def list_files(prefix: str = "", max_keys: int = 100) -> list:
    """List files in R2 bucket with optional prefix filter."""
    client = get_r2_client()
    if not client:
        return []
    
    try:
        response = client.list_objects_v2(
            Bucket=R2_BUCKET,
            Prefix=prefix,
            MaxKeys=max_keys,
        )
        
        files = []
        for obj in response.get("Contents", []):
            files.append({
                "key": obj["Key"],
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
            })
        return files
    except Exception as e:
        logger.error(f"R2 list failed: {e}")
        return []
