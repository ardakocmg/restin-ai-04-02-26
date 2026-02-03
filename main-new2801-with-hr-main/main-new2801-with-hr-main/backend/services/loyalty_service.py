from datetime import datetime
from typing import Optional
from core.database import db
from models.reservations.core import GuestProfile

class LoyaltyService:
    def __init__(self, db_instance):
        self.db = db_instance

    async def record_visit(self, guest_id: str, spend: float = 0.0):
        """Processes a successful visit and awards points/tags"""
        profile_dict = await self.db.guest_profiles.find_one({"id": guest_id})
        if not profile_dict:
            return

        profile = GuestProfile(**profile_dict)
        
        # 1. Update Visit Summary
        profile.visit_summary.total_visits += 1
        profile.visit_summary.total_spend += spend
        profile.visit_summary.last_visit = datetime.now()
        
        # 2. Award Points (100 pts per visit base, plus 1 pt per € spend)
        points_earned = 100 + spend
        profile.loyalty.points_balance += points_earned
        profile.loyalty.lifetime_spend += spend
        profile.loyalty.last_accrued = datetime.now()
        
        # 3. Automatic Tagging & Tiers
        if profile.visit_summary.total_visits >= 5 and "REGULAR" not in profile.tags:
            profile.tags.append("REGULAR")
        if profile.visit_summary.total_visits >= 15 and "VIP" not in profile.tags:
            profile.tags.append("VIP")
            profile.loyalty.tier = "GOLD"
        elif profile.visit_summary.total_visits >= 10:
            profile.loyalty.tier = "SILVER"

        # 4. Save updates
        await self.db.guest_profiles.update_one(
            {"id": guest_id},
            {"$set": profile.model_dump(exclude={"id"})}
        )
        return profile

    async def record_no_show(self, guest_id: str):
        """Increments no-show count and potentially flags risk"""
        await self.db.guest_profiles.update_one(
            {"id": guest_id},
            {
                "$inc": {"visit_summary.no_show_count": 1},
                "$addToSet": {"tags": "NO_SHOW_RISK"}
            }
        )
