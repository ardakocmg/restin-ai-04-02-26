"""ViewState Repository"""
from core.database import db

class ViewStateRepo:
    def __init__(self):
        self.col = db.view_states
    
    async def find(self, venue_id: str, identity_id: str, page_key: str):
        return await self.col.find_one(
            {"venue_id": venue_id, "identity_id": identity_id, "page_key": page_key},
            {"_id": 0}
        )
    
    async def upsert(self, venue_id: str, identity_id: str, page_key: str, ui: dict, query: dict):
        from datetime import datetime, timezone
        
        await self.col.update_one(
            {"venue_id": venue_id, "identity_id": identity_id, "page_key": page_key},
            {"$set": {
                "ui": ui,
                "query": query,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return await self.find(venue_id, identity_id, page_key)

view_state_repo = ViewStateRepo()
