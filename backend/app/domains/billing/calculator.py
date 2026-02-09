import logging
from datetime import datetime, timezone
from app.core.database import get_database
from app.domains.billing.broker import AiBroker

logger = logging.getLogger(__name__)

class BillCalculator:
    """
    Constructs the monthly invoice for a Tenant.
    Aggregates: Base Plan + Modules + AI Usage + Storage.
    """

    @staticmethod
    async def generate_invoice(venue_id: str) -> dict:
        """
        Calculate current month's bill structure.
        """
        db = get_database()
        
        # 1. Base Subscription
        org = await db.organizations.find_one({"id": venue_id})
        if not org:
           return {"error": "Organization not found"}
           
        plan_id = org.get("subscriptionPlanId")
        plan_price = 0.0
        plan_name = "Basic"
        
        if plan_id:
            plan = await db.subscription_plans.find_one({"id": plan_id})
            if plan:
                plan_price = plan.get("basePrice", 0.0)
                plan_name = plan.get("name", "Custom")

        # 2. Module Configs
        module_cost = 0.0
        active_modules = []
        mod_config = await db.module_configs.find_one({"organizationId": venue_id})
        
        if mod_config:
            # Hardcoded prices for MVP - ideally stored in DB or Config
            if mod_config.get("hasVoice"):
                module_cost += 50.0 # $50/mo
                active_modules.append("Voice AI")
            if mod_config.get("hasRadar"):
                module_cost += 30.0 # $30/mo
                active_modules.append("Market Radar")
            if mod_config.get("hasStudio"):
                module_cost += 20.0 # $20/mo
                active_modules.append("Content Studio")
            
            # Custom adjustments
            if mod_config.get("customMonthlyPrice"):
                 module_cost = mod_config["customMonthlyPrice"]

        # 3. AI Usage (Variable)
        ai_cost = await AiBroker.estimate_monthly_cost(venue_id)
        
        # 4. Storage (Placeholder)
        storage_cost = 0.0 
        
        total_due = plan_price + module_cost + ai_cost + storage_cost
        
        return {
            "period": datetime.now(timezone.utc).strftime("%Y-%m"),
            "plan": {
                "name": plan_name,
                "price": plan_price
            },
            "modules": {
                "active": active_modules,
                "price": module_cost
            },
            "usage": {
                "ai_cost": round(ai_cost, 2),
                "storage_cost": round(storage_cost, 2)
            },
            "total_estimated": round(total_due, 2),
            "currency": "EUR"
        }
