"""Payroll Service - Tip distribution and payroll (FUTURE MICROSERVICE)"""
from typing import Dict
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry


class PayrollService:
    """Payroll and tip distribution service"""
    
    def __init__(self):
        self.service_name = "PayrollService"
    
    async def initialize(self):
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["tip_distribution", "salary_calculation", "payslip_generation"],
            subscribed_events=["order.closed", "shift.completed"]
        )
    
    async def distribute_tips(self, order_id: str, tip_amount: float, server_id: str):
        """Distribute tips from closed orders"""
        tip_record = {
            "order_id": order_id,
            "server_id": server_id,
            "amount": tip_amount,
            "distributed_at": datetime.now(timezone.utc).isoformat(),
            "status": "DISTRIBUTED"
        }
        
        await db.tips.insert_one(tip_record)
        
        print(f"💰 PayrollService: €{tip_amount} distributed to server {server_id}")
        
        return tip_record


# Event handlers
@event_handler("order.closed")
async def process_tips(event: Dict):
    """Process tips when order closes"""
    data = event["data"]
    order_id = data.get("order_id")
    total = data.get("total", 0)
    
    # Calculate suggested tip (10%)
    suggested_tip = total * 0.10
    
    print(f"💰 PayrollService: Order {order_id} closed - suggested tip: €{suggested_tip:.2f}")
    
    # Log to payroll DB
    await db.payroll_events.insert_one({
        "event_type": "tip_eligible",
        "order_id": order_id,
        "suggested_tip": suggested_tip,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@event_handler("shift.completed")
async def calculate_shift_earnings(event: Dict):
    """Calculate total earnings for completed shift"""
    data = event["data"]
    shift_id = data.get("shift_id")
    user_id = data.get("user_id")
    
    # Get all tips during this shift
    tips = await db.tips.find({
        "server_id": user_id,
        "distributed_at": {"$gte": data.get("start_time"), "$lte": data.get("end_time")}
    }, {"_id": 0}).to_list(1000)
    
    total_tips = sum(t.get("amount", 0) for t in tips)
    
    print(f"💰 PayrollService: Shift {shift_id} earnings: €{total_tips:.2f}")
    
    # Create payroll record
    await db.payroll_records.insert_one({
        "shift_id": shift_id,
        "user_id": user_id,
        "total_tips": total_tips,
        "calculated_at": datetime.now(timezone.utc).isoformat()
    })


payroll_service = PayrollService()
