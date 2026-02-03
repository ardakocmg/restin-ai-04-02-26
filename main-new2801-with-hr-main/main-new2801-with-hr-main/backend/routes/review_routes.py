"""Review control routes - risk-based review management"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import UserRole, RiskLevel
from services.audit_service import create_audit_log
from utils.helpers import calculate_risk_score


def create_review_router():
    router = APIRouter(tags=["review"])

    @router.get("/venues/{venue_id}/review-risk")
    async def get_review_risk_dashboard(venue_id: str, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, venue_id)
        
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        
        orders = await db.orders.find(
            {"venue_id": venue_id, "status": {"$nin": ["closed", "voided"]}},
            {"_id": 0}
        ).to_list(100)
        
        table_risks = []
        for order in orders:
            score, factors = calculate_risk_score(order)
            
            if score <= venue.get("review_policy_low_threshold", 20):
                level = RiskLevel.LOW
            elif score <= venue.get("review_policy_medium_threshold", 50):
                level = RiskLevel.MEDIUM
            else:
                level = RiskLevel.HIGH
            
            table_risks.append({
                "table_id": order["table_id"],
                "table_name": order["table_name"],
                "order_id": order["id"],
                "risk_score": score,
                "risk_level": level,
                "factors": factors,
                "review_allowed": level == RiskLevel.LOW
            })
        
        return {
            "venue_id": venue_id,
            "policy": {
                "low_threshold": venue.get("review_policy_low_threshold", 20),
                "medium_threshold": venue.get("review_policy_medium_threshold", 50)
            },
            "tables": table_risks
        }

    @router.get("/orders/{order_id}/review-status")
    async def get_review_status(order_id: str, current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        
        venue = await db.venues.find_one({"id": order["venue_id"]}, {"_id": 0})
        score, factors = calculate_risk_score(order)
        
        low_threshold = venue.get("review_policy_low_threshold", 20)
        medium_threshold = venue.get("review_policy_medium_threshold", 50)
        
        if score <= low_threshold:
            level = RiskLevel.LOW
            can_show_qr = True
            requires_override = None
        elif score <= medium_threshold:
            level = RiskLevel.MEDIUM
            can_show_qr = current_user["role"] in [UserRole.OWNER, UserRole.MANAGER]
            requires_override = "manager"
        else:
            level = RiskLevel.HIGH
            can_show_qr = current_user["role"] == UserRole.OWNER
            requires_override = "owner"
        
        return {
            "order_id": order_id,
            "risk_score": score,
            "risk_level": level,
            "factors": factors,
            "can_show_qr": can_show_qr,
            "requires_override": requires_override
        }

    @router.post("/orders/{order_id}/override-review")
    async def override_review_block(order_id: str, reason: str, current_user: dict = Depends(get_current_user)):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        await check_venue_access(current_user, order["venue_id"])
        
        venue = await db.venues.find_one({"id": order["venue_id"]}, {"_id": 0})
        score, _ = calculate_risk_score(order)
        
        medium_threshold = venue.get("review_policy_medium_threshold", 50)
        
        if score <= medium_threshold:
            required_role = UserRole.MANAGER
        else:
            required_role = UserRole.OWNER
        
        if current_user["role"] == UserRole.STAFF:
            raise HTTPException(status_code=403, detail="Override not allowed for staff")
        
        if current_user["role"] == UserRole.MANAGER and required_role == UserRole.OWNER:
            raise HTTPException(status_code=403, detail="Owner override required for high risk")
        
        await create_audit_log(
            order["venue_id"], current_user["id"], current_user["name"],
            "review_override", "order", order_id,
            {"risk_score": score, "reason": reason}
        )
        
        return {"message": "Override granted", "risk_score": score}

    return router
