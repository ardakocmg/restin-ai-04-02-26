"""Advanced Procurement Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.procurement_advanced import (
    RFQ, RFQStatus, ApprovalRule, ProcurementApproval,
    AutoOrderRule, ApprovalStatus
)


def create_procurement_advanced_router():
    router = APIRouter(tags=["procurement_advanced"])
    
    @router.post("/venues/{venue_id}/rfq")
    async def create_rfq(
        venue_id: str,
        rfq_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rfq = RFQ(
            venue_id=venue_id,
            rfq_number=f"RFQ-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}",
            title=rfq_data["title"],
            description=rfq_data.get("description"),
            items=rfq_data["items"],
            suppliers=rfq_data["suppliers"],
            created_by=current_user["id"],
            deadline=rfq_data.get("deadline")
        )
        
        result = await db.rfqs.insert_one(rfq.model_dump())
        rfq_dict = rfq.model_dump()
        rfq_dict["_id"] = str(result.inserted_id)
        return rfq_dict
    
    @router.get("/venues/{venue_id}/rfq")
    async def list_rfqs(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        
        rfqs = await db.rfqs.find(query, {"_id": 0}).to_list(1000)
        return rfqs
    
    @router.post("/venues/{venue_id}/rfq/{rfq_id}/quote")
    async def submit_quote(
        venue_id: str,
        rfq_id: str,
        quote_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rfq = await db.rfqs.find_one({"id": rfq_id, "venue_id": venue_id}, {"_id": 0})
        if not rfq:
            raise HTTPException(404, "RFQ not found")
        
        quote = {
            "supplier_id": quote_data["supplier_id"],
            "supplier_name": quote_data["supplier_name"],
            "items": quote_data["items"],
            "total_amount": quote_data["total_amount"],
            "valid_until": quote_data.get("valid_until"),
            "notes": quote_data.get("notes"),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.rfqs.update_one(
            {"id": rfq_id},
            {
                "$push": {"quotes": quote},
                "$set": {"status": "quoted"}
            }
        )
        
        return {"message": "Quote submitted", "quote": quote}
    
    @router.post("/venues/{venue_id}/rfq/{rfq_id}/award")
    async def award_rfq(
        venue_id: str,
        rfq_id: str,
        award_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.rfqs.update_one(
            {"id": rfq_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "awarded",
                    "awarded_supplier_id": award_data["supplier_id"]
                }
            }
        )
        
        return {"message": "RFQ awarded successfully"}
    
    @router.post("/venues/{venue_id}/procurement/approval-rules")
    async def create_approval_rule(
        venue_id: str,
        rule_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rule = ApprovalRule(
            venue_id=venue_id,
            rule_name=rule_data["rule_name"],
            condition=rule_data["condition"],
            threshold=rule_data.get("threshold"),
            approvers=rule_data["approvers"],
            escalation_hours=rule_data.get("escalation_hours")
        )
        
        await db.approval_rules.insert_one(rule.model_dump())
        return rule.model_dump()
    
    @router.get("/venues/{venue_id}/procurement/approval-rules")
    async def list_approval_rules(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rules = await db.approval_rules.find(
            {"venue_id": venue_id, "active": True},
            {"_id": 0}
        ).to_list(1000)
        return rules
    
    @router.post("/venues/{venue_id}/procurement/auto-order-rules")
    async def create_auto_order_rule(
        venue_id: str,
        rule_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rule = AutoOrderRule(
            venue_id=venue_id,
            item_id=rule_data["item_id"],
            supplier_id=rule_data["supplier_id"],
            reorder_point=rule_data["reorder_point"],
            order_quantity=rule_data["order_quantity"],
            lead_time_days=rule_data["lead_time_days"]
        )
        
        await db.auto_order_rules.insert_one(rule.model_dump())
        return rule.model_dump()
    
    @router.get("/venues/{venue_id}/procurement/auto-order-rules")
    async def list_auto_order_rules(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rules = await db.auto_order_rules.find(
            {"venue_id": venue_id, "active": True},
            {"_id": 0}
        ).to_list(1000)
        return rules
    
    return router
