"""Document routes - upload, management, OCR"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from services.document_service import save_document, ALLOWED_MIME
from services.ocr_service import extract_text


def create_document_router():
    router = APIRouter(tags=["documents"])

    @router.post("/documents/upload")
    async def upload_document(
        file: UploadFile = File(...),
        venue_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        category: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Upload a document with OCR support"""
        if venue_id:
            await check_venue_access(current_user, venue_id)
        
        if file.content_type not in ALLOWED_MIME:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
        
        file_content = await file.read()
        
        doc_meta = {
            "venue_id": venue_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "category": category,
            "uploaded_by": current_user["id"],
            "uploader_name": current_user["name"]
        }
        
        success, result = await save_document(db, file.filename, file_content, file.content_type, doc_meta)
        
        if not success:
            raise HTTPException(status_code=500, detail=result.get("error", "Upload failed"))
        
        doc_id = result["document_id"]
        
        # OCR for images
        if file.content_type.startswith("image/"):
            try:
                ocr_text = extract_text(file_content)
                if ocr_text:
                    await db.documents.update_one(
                        {"id": doc_id},
                        {"$set": {"ocr_text": ocr_text}}
                    )
                    result["ocr_text"] = ocr_text
            except Exception as e:
                result["ocr_error"] = str(e)
        
        return result

    @router.get("/documents")
    async def list_documents(
        venue_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 100,
        current_user: dict = Depends(get_current_user)
    ):
        """List documents with filters"""
        query = {}
        if venue_id:
            await check_venue_access(current_user, venue_id)
            query["venue_id"] = venue_id
        if entity_type:
            query["entity_type"] = entity_type
        if entity_id:
            query["entity_id"] = entity_id
        if category:
            query["category"] = category
        
        docs = await db.documents.find(query, {"_id": 0, "file_data": 0}).sort("uploaded_at", -1).limit(limit).to_list(limit)
        return docs

    @router.get("/documents/{document_id}")
    async def get_document(document_id: str, current_user: dict = Depends(get_current_user)):
        """Get document metadata"""
        doc = await db.documents.find_one({"id": document_id}, {"_id": 0, "file_data": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if doc.get("venue_id"):
            await check_venue_access(current_user, doc["venue_id"])
        
        return doc

    @router.delete("/documents/{document_id}")
    async def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
        """Delete a document"""
        doc = await db.documents.find_one({"id": document_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if doc.get("venue_id"):
            await check_venue_access(current_user, doc["venue_id"])
        
        await db.documents.delete_one({"id": document_id})
        return {"message": "Document deleted"}

    return router
