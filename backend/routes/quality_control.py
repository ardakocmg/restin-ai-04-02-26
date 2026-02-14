"""Quality Control & Compliance Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.quality_control import QualityAudit, AllergenInfo, ComplianceDocument, AuditType, QualityAuditRequest, ComplianceDocumentRequest


def create_quality_control_router():
    router = APIRouter(tags=["quality_control"])
    
    @router.post("/venues/{venue_id}/quality/audits")
    async def create_audit(
        venue_id: str,
        audit_data: QualityAuditRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Calculate score
        checklist = audit_data.checklist
        passed = sum(1 for item in checklist if item.get("status") == "pass")
        total = len(checklist)
        score = (passed / total * 100) if total > 0 else 0
        
        audit = QualityAudit(
            venue_id=venue_id,
            audit_type=AuditType(audit_data.audit_type),
            audit_date=audit_data.audit_date,
            auditor_id=current_user["id"],
            auditor_name=current_user.get("name", "Unknown"),
            checklist=checklist,
            overall_score=score,
            findings=audit_data.findings,
            corrective_actions=audit_data.corrective_actions,
            follow_up_required=audit_data.follow_up_required,
            follow_up_date=audit_data.follow_up_date
        )
        
        await db.quality_audits.insert_one(audit.model_dump())
        return audit.model_dump()
    
    @router.get("/venues/{venue_id}/quality/audits")
    async def list_audits(
        venue_id: str,
        audit_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if audit_type:
            query["audit_type"] = audit_type
        
        audits = await db.quality_audits.find(query, {"_id": 0}).sort("audit_date", -1).to_list(1000)
        return audits
    
    @router.post("/venues/{venue_id}/quality/audits/{audit_id}/sign-off")
    async def sign_off_audit(
        venue_id: str,
        audit_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.quality_audits.update_one(
            {"id": audit_id, "venue_id": venue_id},
            {"$set": {"signed_off": True}}
        )
        
        return {"message": "Audit signed off"}
    
    @router.post("/venues/{venue_id}/quality/allergens")
    async def create_allergen_info(
        venue_id: str,
        allergen_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        allergen_info = AllergenInfo(
            item_id=allergen_data["item_id"],
            item_name=allergen_data["item_name"],
            allergens=allergen_data.get("allergens", []),
            may_contain=allergen_data.get("may_contain", []),
            allergen_free=allergen_data.get("allergen_free", []),
            cross_contamination_risk=allergen_data.get("cross_contamination_risk", False)
        )
        
        # Upsert
        await db.allergen_info.update_one(
            {"item_id": allergen_data["item_id"]},
            {"$set": allergen_info.model_dump()},
            upsert=True
        )
        
        return allergen_info.model_dump()
    
    @router.get("/venues/{venue_id}/quality/allergens")
    async def list_allergen_info(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Get all items for venue and their allergen info
        allergens = await db.allergen_info.find({}, {"_id": 0}).to_list(500)
        return allergens
    
    @router.post("/venues/{venue_id}/compliance/documents")
    async def create_compliance_document(
        venue_id: str,
        doc_data: ComplianceDocumentRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Determine status based on expiry
        status = "valid"
        if doc_data.expiry_date:
            expiry = datetime.fromisoformat(doc_data.expiry_date).replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_until_expiry = (expiry - now).days
            
            if days_until_expiry < 0:
                status = "expired"
            elif days_until_expiry < 30:
                status = "expiring_soon"
        
        document = ComplianceDocument(
            venue_id=venue_id,
            document_type=doc_data.document_type,
            document_name=doc_data.document_name,
            issuing_authority=doc_data.issuing_authority,
            issue_date=doc_data.issue_date,
            expiry_date=doc_data.expiry_date,
            document_url=doc_data.document_url,
            status=status
        )
        
        await db.compliance_documents.insert_one(document.model_dump())
        return document.model_dump()
    
    @router.get("/venues/{venue_id}/compliance/documents")
    async def list_compliance_documents(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        documents = await db.compliance_documents.find(query, {"_id": 0}).to_list(1000)
        return documents
    
    @router.get("/venues/{venue_id}/compliance/expiring-soon")
    async def get_expiring_documents(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        documents = await db.compliance_documents.find(
            {"venue_id": venue_id, "status": {"$in": ["expiring_soon", "expired"]}},
            {"_id": 0}
        ).to_list(1000)
        
        return documents
    
    return router
