"""Global Search Routes"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from services.global_search_service import global_search_service


def create_global_search_router():
    router = APIRouter(tags=["global_search"])
    
    @router.get("/venues/{venue_id}/search")
    async def global_search(
        venue_id: str,
        q: str = Query(..., description="Search query"),
        modules: Optional[str] = Query(None, description="Comma-separated modules to search"),
        limit: int = Query(50, description="Maximum results"),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        if not q or len(q) < 2:
            raise HTTPException(400, "Query must be at least 2 characters")
        
        module_list = None
        if modules:
            module_list = [m.strip() for m in modules.split(",") if m.strip()]
        
        results = await global_search_service.search(venue_id, q, module_list, limit)
        
        return results
    
    return router
