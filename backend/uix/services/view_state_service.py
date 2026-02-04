"""ViewState Service - Resolve and persist user view preferences"""
from uix.repos.view_state_repo import view_state_repo

# Default schemas per page
DEFAULT_SCHEMAS = {
    "inventory.items": {
        "q": "",
        "filters": {},
        "sort": "name",
        "page_size": 50,
        "ui": {"filters_open": True, "filter_sections": {"status": True, "category": True}}
    },
    "inventory.suppliers": {
        "q": "",
        "filters": {},
        "sort": "name",
        "page_size": 50,
        "ui": {"filters_open": False, "filter_sections": {}}
    }
}

class ViewStateService:
    
    async def get_view_state(self, venue_id: str, identity_id: str, page_key: str):
        """Get or create default view state"""
        saved = await view_state_repo.find(venue_id, identity_id, page_key)
        
        if saved:
            return saved
        
        # Return default
        default = DEFAULT_SCHEMAS.get(page_key, {
            "q": "",
            "filters": {},
            "sort": "name",
            "page_size": 50,
            "ui": {"filters_open": True, "filter_sections": {}}
        })
        
        return {
            "venue_id": venue_id,
            "identity_id": identity_id,
            "page_key": page_key,
            "ui": default.get("ui", {}),
            "query": {
                "q": default.get("q", ""),
                "filters": default.get("filters", {}),
                "sort": default.get("sort", "name"),
                "page_size": default.get("page_size", 50)
            }
        }
    
    async def save_view_state(self, venue_id: str, identity_id: str, page_key: str, ui: dict, query: dict):
        """Save user's view preferences"""
        return await view_state_repo.upsert(venue_id, identity_id, page_key, ui, query)

view_state_service = ViewStateService()
