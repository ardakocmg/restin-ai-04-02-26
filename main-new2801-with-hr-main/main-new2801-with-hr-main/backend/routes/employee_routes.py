"""Employee self-service routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from core.database import db
from core.dependencies import get_current_user


def create_employee_router():
    router = APIRouter(tags=["employee"])

    @router.get("/employee/tips")
    async def get_my_tips(
        user_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get employee's tip history"""
        target_user_id = user_id or current_user["id"]
        
        # Only allow viewing own tips unless manager/owner
        if target_user_id != current_user["id"] and current_user["role"] not in ["owner", "manager"]:
            raise HTTPException(status_code=403, detail="Can only view own tips")
        
        tips = await db.tips.find(
            {"server_id": target_user_id},
            {"_id": 0}
        ).sort("distributed_at", -1).to_list(100)
        
        return tips

    @router.get("/employee/payslips")
    async def get_my_payslips(current_user: dict = Depends(get_current_user)):
        """Get employee's payslips"""
        payslips = await db.documents.find(
            {
                "entity_type": "user",
                "entity_id": current_user["id"],
                "category": "payslip"
            },
            {"_id": 0, "file_data": 0}
        ).sort("uploaded_at", -1).to_list(50)
        
        return payslips

    @router.get("/employee/documents")
    async def get_my_documents(current_user: dict = Depends(get_current_user)):
        """Get employee's documents (contracts, certificates, etc.)"""
        docs = await db.documents.find(
            {
                "entity_type": "user",
                "entity_id": current_user["id"]
            },
            {"_id": 0, "file_data": 0}
        ).sort("uploaded_at", -1).to_list(100)
        
        return docs

    return router
