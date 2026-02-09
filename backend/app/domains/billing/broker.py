import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from app.core.database import get_database
from app.core.config import settings

logger = logging.getLogger(__name__)

class AiBroker:
    """
    Centralized broker for all AI usage. 
    Calculates costs (our liability) and prices (user invoice) based on active configuration.
    """

    @staticmethod
    async def get_config(venue_id: str) -> dict:
        """Fetch the active broker configuration for markup rates."""
        db = get_database()
        config = await db.ai_broker_configs.find_one({"organizationId": venue_id, "isActive": True})
        
        if not config:
            # Default fallback if no specific config exists
            return {
                "provider": "GOOGLE",
                "model": "gemini-1.5-flash",
                "costPerUnit": 0.0001, # $0.10 per 1k tokens? adjust as needed
                "sellPricePerUnit": 0.0002, # 100% Markup
                "unitType": "TOKEN"
            }
        return config

    @staticmethod
    async def track_usage(
        venue_id: str, 
        feature: str,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> dict:
        """
        Record AI usage, calculate costs/profits, and save to audit log.
        Returns the simplified usage record.
        """
        db = get_database()
        config = await AiBroker.get_config(venue_id)
        
        total_tokens = input_tokens + output_tokens
        
        # Cost Logic (Simplified for MVP - uses blending input/output)
        # In real world: Input and Output often have different costs.
        # Here we use the stored config's average unit cost.
        cost_unit = config.get("costPerUnit", 0.0)
        sell_unit = config.get("sellPricePerUnit", 0.0)
        
        # Calculate financials (in Cents/Floating Point)
        cost_cents = total_tokens * cost_unit
        price_cents = total_tokens * sell_unit
        profit_cents = price_cents - cost_cents
        
        now = datetime.now(timezone.utc).isoformat()
        
        usage_log = {
            "organizationId": venue_id, # Linking to Organization (Tenant)
            "venue_id": venue_id, # Keeping both provided context is usually venue_id
            "modelUsed": model,
            "provider": provider,
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "totalTokens": total_tokens,
            "costCents": cost_cents,
            "priceCents": price_cents,
            "profitCents": profit_cents,
            "feature": feature,
            "timestamp": now
        }
        
        await db.ai_usage_logs.insert_one(usage_log)
        
        return usage_log

    @staticmethod
    async def estimate_monthly_cost(venue_id: str) -> float:
        """Calculate total AI usage cost for the current month so far."""
        db = get_database()
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        pipeline = [
            {"$match": {
                "organizationId": venue_id,
                "timestamp": {"$gte": start_of_month}
            }},
            {"$group": {
                "_id": None,
                "totalPrice": {"$sum": "$priceCents"}
            }}
        ]
        
        result = await db.ai_usage_logs.aggregate(pipeline).to_list(length=1)
        if result:
            return result[0]["totalPrice"]
        return 0.0
