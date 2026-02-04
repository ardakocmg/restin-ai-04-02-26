"""Kill Switch Service"""
from core.database import db


class KillSwitchService:
    
    async def is_enabled(self, venue_id: str, key: str, default: bool = True) -> bool:
        """Check if a kill switch is enabled"""
        switch = await db.kill_switches.find_one(
            {"venue_id": venue_id, "key": key},
            {"_id": 0}
        )
        
        if not switch:
            return default
        
        return switch.get("enabled", default)

kill_switch_service = KillSwitchService()
