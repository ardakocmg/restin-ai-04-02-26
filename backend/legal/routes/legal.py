"""Legal Entity Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user


def create_legal_router():
    router = APIRouter(tags=["legal"])

    @router.get("/legal/entities")
    async def list_entities(
        group_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        entities = await db.legal_entities.find(
            {"group_id": group_id},
            {"_id": 0}
        ).to_list(100)
        
        return {"ok": True, "data": entities}

    return router
