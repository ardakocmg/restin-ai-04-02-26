import logging
from datetime import datetime, timezone
from app.core.database import get_database
from app.domains.billing.broker import AiBroker

logger = logging.getLogger(__name__)

# Default module prices (EUR) — used only if no DB pricing exists
DEFAULT_MODULE_PRICES = {
    "hasVoice": {"price": 50.0, "label": "Voice AI"},
    "hasRadar": {"price": 30.0, "label": "Market Radar"},
    "hasStudio": {"price": 20.0, "label": "Content Studio"},
    "hasCRM": {"price": 25.0, "label": "Autopilot CRM"},
    "hasWeb": {"price": 15.0, "label": "Web Architect"},
    "hasFintech": {"price": 35.0, "label": "Fintech"},
}

# Default storage pricing
DEFAULT_STORAGE_PRICE_PER_GB = 0.50
DEFAULT_VECTOR_PRICE_PER_1K = 0.10


class BillCalculator:
    """
    Constructs the monthly invoice for a Tenant.
    Aggregates: Base Plan + Modules + AI Usage + Storage.
    Pricing is DB-driven with fallback defaults.
    """

    @staticmethod
    async def _get_module_pricing(db) -> dict:
        """Load module pricing from DB, fall back to defaults."""
        pricing = {}
        db_prices = await db.module_pricing.find({}, {"_id": 0}).to_list(50)

        if db_prices:
            for p in db_prices:
                key = p.get("module_key")
                if key:
                    pricing[key] = {
                        "price": p.get("monthly_price", 0.0),
                        "label": p.get("display_name", key),
                    }
            return pricing

        # No DB pricing found — return defaults
        return DEFAULT_MODULE_PRICES

    @staticmethod
    async def _get_storage_pricing(db) -> dict:
        """Load storage billing rates from DB."""
        storage_config = await db.storage_billing.find_one(
            {}, {"_id": 0}, sort=[("created_at", -1)]
        )

        if storage_config:
            return {
                "price_per_gb": storage_config.get("pricePerGB", DEFAULT_STORAGE_PRICE_PER_GB),
                "price_per_1k_vectors": storage_config.get("pricePer1kVectors", DEFAULT_VECTOR_PRICE_PER_1K),
            }

        return {
            "price_per_gb": DEFAULT_STORAGE_PRICE_PER_GB,
            "price_per_1k_vectors": DEFAULT_VECTOR_PRICE_PER_1K,
        }

    @staticmethod
    async def generate_invoice(venue_id: str) -> dict:
        """
        Calculate current month's bill structure.
        All pricing is loaded from DB with sensible fallbacks.
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

        # 2. Module Configs — pricing from DB
        module_cost = 0.0
        active_modules = []
        mod_config = await db.module_configs.find_one({"organizationId": venue_id})
        module_pricing = await BillCalculator._get_module_pricing(db)

        if mod_config:
            for module_key, price_info in module_pricing.items():
                if mod_config.get(module_key):
                    module_cost += price_info["price"]
                    active_modules.append(price_info["label"])

            # Custom override takes precedence
            if mod_config.get("customMonthlyPrice"):
                module_cost = mod_config["customMonthlyPrice"]

        # 3. AI Usage (Variable — from broker)
        ai_cost = await AiBroker.estimate_monthly_cost(venue_id)

        # 4. Storage — pricing from DB
        storage_pricing = await BillCalculator._get_storage_pricing(db)
        storage_billing = await db.storage_billing.find_one({"tenantId": venue_id})
        storage_cost = 0.0

        if storage_billing:
            media_gb = storage_billing.get("totalMediaSizeMB", 0) / 1024.0
            vector_count = storage_billing.get("totalVectorCount", 0)
            storage_cost = (
                media_gb * storage_pricing["price_per_gb"]
                + (vector_count / 1000.0) * storage_pricing["price_per_1k_vectors"]
            )

        total_due = plan_price + module_cost + ai_cost + storage_cost

        return {
            "period": datetime.now(timezone.utc).strftime("%Y-%m"),
            "plan": {
                "name": plan_name,
                "price": plan_price,
            },
            "modules": {
                "active": active_modules,
                "price": round(module_cost, 2),
            },
            "usage": {
                "ai_cost": round(ai_cost, 2),
                "storage_cost": round(storage_cost, 2),
            },
            "total_estimated": round(total_due, 2),
            "currency": "EUR",
        }
