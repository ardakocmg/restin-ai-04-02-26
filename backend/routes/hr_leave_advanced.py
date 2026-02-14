"""Advanced Leave Management Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_leave_advanced import (
    LeaveAccrualRule, BlackoutDate, LeaveBalance, LeaveRequestAdvanced
)


def create_hr_leave_advanced_router():
    router = APIRouter(tags=["hr_leave_advanced"])
    
    @router.post("/venues/{venue_id}/hr/leave/accrual-rules")
    async def create_accrual_rule(
        venue_id: str,
        rule_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rule = LeaveAccrualRule(
            venue_id=venue_id,
            leave_type=rule_data["leave_type"],
            accrual_method=rule_data["accrual_method"],
            accrual_rate=rule_data["accrual_rate"],
            max_balance=rule_data.get("max_balance"),
            carryover_allowed=rule_data.get("carryover_allowed", False),
            carryover_max=rule_data.get("carryover_max"),
            carryover_expiry_months=rule_data.get("carryover_expiry_months"),
            probation_period_months=rule_data.get("probation_period_months", 0)
        )
        
        await db.leave_accrual_rules.insert_one(rule.model_dump())
        return rule.model_dump()
    
    @router.get("/venues/{venue_id}/hr/leave/accrual-rules")
    async def list_accrual_rules(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        rules = await db.leave_accrual_rules.find(
            {"venue_id": venue_id, "active": True},
            {"_id": 0}
        ).to_list(1000)
        return rules
    
    @router.post("/venues/{venue_id}/hr/leave/blackout-dates")
    async def create_blackout_date(
        venue_id: str,
        blackout_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        blackout = BlackoutDate(
            venue_id=venue_id,
            name=blackout_data["name"],
            start_date=blackout_data["start_date"],
            end_date=blackout_data["end_date"],
            reason=blackout_data["reason"],
            applies_to_roles=blackout_data.get("applies_to_roles", [])
        )
        
        await db.blackout_dates.insert_one(blackout.model_dump())
        return blackout.model_dump()
    
    @router.get("/venues/{venue_id}/hr/leave/blackout-dates")
    async def list_blackout_dates(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        blackouts = await db.blackout_dates.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(1000)
        return blackouts
    
    @router.get("/venues/{venue_id}/hr/leave/balance/{employee_id}")
    async def get_leave_balance(
        venue_id: str,
        employee_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        balances = await db.leave_balances.find(
            {"venue_id": venue_id, "employee_id": employee_id},
            {"_id": 0}
        ).to_list(100)
        
        return balances
    
    @router.post("/venues/{venue_id}/hr/leave/requests")
    async def create_leave_request(
        venue_id: str,
        request_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Check blackout dates
        blackouts = await db.blackout_dates.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(1000)
        
        start_date = datetime.fromisoformat(request_data["start_date"])
        end_date = datetime.fromisoformat(request_data["end_date"])
        
        for blackout in blackouts:
            blackout_start = datetime.fromisoformat(blackout["start_date"])
            blackout_end = datetime.fromisoformat(blackout["end_date"])
            
            if not (end_date < blackout_start or start_date > blackout_end):
                if not request_data.get("blackout_override", False):
                    raise HTTPException(400, f"Leave overlaps with blackout period: {blackout['name']}")
        
        # Check balance
        balance_record = await db.leave_balances.find_one(
            {
                "venue_id": venue_id,
                "employee_id": request_data["employee_id"],
                "leave_type": request_data["leave_type"]
            },
            {"_id": 0}
        )
        
        if balance_record and balance_record["balance"] < request_data["days"]:
            raise HTTPException(400, "Insufficient leave balance")
        
        leave_request = LeaveRequestAdvanced(
            venue_id=venue_id,
            employee_id=request_data["employee_id"],
            employee_name=request_data["employee_name"],
            leave_type=request_data["leave_type"],
            start_date=request_data["start_date"],
            end_date=request_data["end_date"],
            days=request_data["days"],
            reason=request_data.get("reason"),
            blackout_override=request_data.get("blackout_override", False),
            balance_checked=True,
            balance_at_request=balance_record["balance"] if balance_record else None
        )
        
        await db.leave_requests.insert_one(leave_request.model_dump())
        return leave_request.model_dump()
    
    @router.get("/venues/{venue_id}/hr/leave/requests")
    async def list_leave_requests(
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
        
        requests = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return requests
    
    @router.post("/venues/{venue_id}/hr/leave/requests/{request_id}/approve")
    async def approve_leave_request(
        venue_id: str,
        request_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Update request
        await db.leave_requests.update_one(
            {"id": request_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "approved",
                    "approved_by": current_user["id"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update balance
        request = await db.leave_requests.find_one({"id": request_id}, {"_id": 0})
        if request:
            await db.leave_balances.update_one(
                {
                    "venue_id": venue_id,
                    "employee_id": request["employee_id"],
                    "leave_type": request["leave_type"]
                },
                {
                    "$inc": {
                        "used": request["days"],
                        "pending": -request["days"],
                        "balance": -request["days"]
                    }
                }
            )
        
        return {"message": "Leave request approved"}
    
    @router.post("/venues/{venue_id}/hr/leave/requests/{request_id}/reject")
    async def reject_leave_request(
        venue_id: str,
        request_id: str,
        rejection_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.leave_requests.update_one(
            {"id": request_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejected_by": current_user["id"],
                    "rejection_reason": rejection_data.get("reason"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Leave request rejected"}
    
    return router
