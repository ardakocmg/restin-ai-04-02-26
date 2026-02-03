"""Expense Management Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import json

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_expense import ExpenseClaim, ExpenseCategory, ExpenseReceipt, ExpenseStatus
from services.openai_integration import openai_service


def create_hr_expense_router():
    router = APIRouter(tags=["hr_expense"])
    
    @router.post("/venues/{venue_id}/hr/expense/categories")
    async def create_expense_category(
        venue_id: str,
        category_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        category = ExpenseCategory(
            venue_id=venue_id,
            category_name=category_data["category_name"],
            requires_receipt=category_data.get("requires_receipt", True),
            max_amount=category_data.get("max_amount"),
            approval_required=category_data.get("approval_required", True),
            approvers=category_data.get("approvers", [])
        )
        
        await db.ExpenseCategories.insert_one(category.model_dump())
        return category.model_dump()
    
    @router.get("/venues/{venue_id}/hr/expense/categories")
    async def list_expense_categories(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        categories = await db.ExpenseCategories.find(
            {"venue_id": venue_id, "active": True},
            {"_id": 0}
        ).to_list(1000)
        return categories
    
    @router.post("/venues/{venue_id}/hr/expense/claims")
    async def create_expense_claim(
        venue_id: str,
        claim_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # OCR receipt if image provided
        receipt = None
        if claim_data.get("receipt_image_base64"):
            try:
                ocr_result = await openai_service.analyze_receipt(claim_data["receipt_image_base64"])
                ocr_data_str = ocr_result.get("ocr_result", "")
                
                # Try to parse JSON
                if "{" in ocr_data_str and "}" in ocr_data_str:
                    start = ocr_data_str.index("{")
                    end = ocr_data_str.rindex("}") + 1
                    ocr_data = json.loads(ocr_data_str[start:end])
                    
                    receipt = ExpenseReceipt(
                        receipt_number=ocr_data.get("receipt_number"),
                        image_base64=claim_data["receipt_image_base64"],
                        ocr_extracted_amount=ocr_data.get("amount"),
                        ocr_extracted_date=ocr_data.get("date"),
                        ocr_extracted_vendor=ocr_data.get("vendor")
                    )
            except Exception as e:
                # OCR failed, still save claim
                receipt = ExpenseReceipt(image_base64=claim_data["receipt_image_base64"])
        
        # Get category info
        category = await db.ExpenseCategories.find_one(
            {"id": claim_data["category_id"]},
            {"_id": 0}
        )
        
        claim = ExpenseClaim(
            venue_id=venue_id,
            employee_id=current_user["id"],
            employee_name=current_user.get("name", "Unknown"),
            claim_number=f"EXP-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            expense_date=claim_data["expense_date"],
            category_id=claim_data["category_id"],
            category_name=category["category_name"] if category else "Unknown",
            amount=claim_data["amount"],
            currency=claim_data.get("currency", "USD"),
            reason=claim_data["reason"],
            receipt=receipt.model_dump() if receipt else None
        )
        
        await db.ExpenseClaims.insert_one(claim.model_dump())
        return claim.model_dump()
    
    @router.get("/venues/{venue_id}/hr/expense/claims")
    async def list_expense_claims(
        venue_id: str,
        status: Optional[str] = None,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        if employee_id:
            query["employee_id"] = employee_id
        
        # Exclude base64 images from list
        claims = await db.ExpenseClaims.find(
            query,
            {"_id": 0, "receipt.image_base64": 0}
        ).sort("created_at", -1).to_list(1000)
        return claims
    
    @router.post("/venues/{venue_id}/hr/expense/claims/{claim_id}/submit")
    async def submit_expense_claim(
        venue_id: str,
        claim_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.ExpenseClaims.update_one(
            {"id": claim_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "submitted",
                    "submitted_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Expense claim submitted"}
    
    @router.post("/venues/{venue_id}/hr/expense/claims/{claim_id}/approve")
    async def approve_expense_claim(
        venue_id: str,
        claim_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.ExpenseClaims.update_one(
            {"id": claim_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "approved",
                    "approved_by": current_user["id"],
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Expense claim approved"}
    
    @router.post("/venues/{venue_id}/hr/expense/claims/{claim_id}/reject")
    async def reject_expense_claim(
        venue_id: str,
        claim_id: str,
        rejection_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.ExpenseClaims.update_one(
            {"id": claim_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejected_by": current_user["id"],
                    "rejection_reason": rejection_data.get("reason"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Expense claim rejected"}
    
    @router.post("/venues/{venue_id}/hr/expense/claims/{claim_id}/reimburse")
    async def reimburse_expense_claim(
        venue_id: str,
        claim_id: str,
        reimbursement_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.ExpenseClaims.update_one(
            {"id": claim_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "reimbursed",
                    "reimbursed_at": datetime.now(timezone.utc).isoformat(),
                    "payment_reference": reimbursement_data.get("payment_reference"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Expense claim reimbursed"}
    
    return router
