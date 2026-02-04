"""Advanced Document Management Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_documents_advanced import (
    EmployeeDocument, DocumentReminder, CertificateTraining, DocumentType, DocumentStatus, EmployeeDocumentRequest
)


def create_hr_documents_advanced_router():
    router = APIRouter(tags=["hr_documents_advanced"])
    
    @router.post("/venues/{venue_id}/hr/documents")
    async def upload_employee_document(
        venue_id: str,
        document_data: EmployeeDocumentRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Determine status
        status = DocumentStatus.VALID
        if document_data.expiry_date:
            expiry = datetime.fromisoformat(document_data.expiry_date).replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_until_expiry = (expiry - now).days
            
            if days_until_expiry < 0:
                status = DocumentStatus.EXPIRED
            elif days_until_expiry < 30:
                status = DocumentStatus.EXPIRING_SOON
        
        document = EmployeeDocument(
            venue_id=venue_id,
            employee_id=document_data.employee_id,
            document_type=DocumentType(document_data.document_type),
            document_name=document_data.document_name,
            document_number=document_data.document_number,
            issue_date=document_data.issue_date,
            expiry_date=document_data.expiry_date,
            issuing_authority=document_data.issuing_authority,
            file_url=document_data.file_url,
            file_base64=document_data.file_base64,
            status=status,
            reminder_days_before=document_data.reminder_days_before,
            notes=document_data.notes,
            uploaded_by=current_user["id"]
        )
        
        await db.EmployeeDocuments.insert_one(document.model_dump())
        return document.model_dump()
    
    @router.get("/venues/{venue_id}/hr/documents")
    async def list_employee_documents(
        venue_id: str,
        employee_id: Optional[str] = None,
        document_type: Optional[str] = None,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        if document_type:
            query["document_type"] = document_type
        if status:
            query["status"] = status
        
        # Exclude file content from list
        documents = await db.EmployeeDocuments.find(
            query,
            {"_id": 0, "file_base64": 0}
        ).to_list(10000)
        return documents
    
    @router.get("/venues/{venue_id}/hr/documents/expiring-soon")
    async def get_expiring_documents(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        documents = await db.EmployeeDocuments.find(
            {
                "venue_id": venue_id,
                "status": {"$in": ["expiring_soon", "expired"]}
            },
            {"_id": 0, "file_base64": 0}
        ).to_list(10000)
        
        return documents
    
    @router.post("/venues/{venue_id}/hr/documents/{document_id}/verify")
    async def verify_document(
        venue_id: str,
        document_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.EmployeeDocuments.update_one(
            {"id": document_id, "venue_id": venue_id},
            {
                "$set": {
                    "verified": True,
                    "verified_by": current_user["id"],
                    "verified_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Document verified"}
    
    @router.post("/venues/{venue_id}/hr/training-certificates")
    async def create_training_certificate(
        venue_id: str,
        certificate_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        certificate = CertificateTraining(
            venue_id=venue_id,
            employee_id=certificate_data["employee_id"],
            training_name=certificate_data["training_name"],
            provider=certificate_data["provider"],
            completion_date=certificate_data["completion_date"],
            expiry_date=certificate_data.get("expiry_date"),
            certificate_url=certificate_data.get("certificate_url"),
            hours=certificate_data.get("hours"),
            score=certificate_data.get("score")
        )
        
        await db.TrainingCertificates.insert_one(certificate.model_dump())
        return certificate.model_dump()
    
    @router.get("/venues/{venue_id}/hr/training-certificates")
    async def list_training_certificates(
        venue_id: str,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        
        certificates = await db.TrainingCertificates.find(query, {"_id": 0}).to_list(10000)
        return certificates
    
    return router
