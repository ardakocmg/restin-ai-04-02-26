"""Reputation Hub Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_reputation_router():
    router = APIRouter(tags=["reputation"])

    @router.get("/reputation/reviews")
    async def list_reviews(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        reviews = await db.reviews.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("published_at", -1).to_list(200)
        
        return {"ok": True, "data": reviews}

    return router
