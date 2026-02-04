"""Collab PTT Productization Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_collab_ptt_router():
    router = APIRouter(tags=["collab_ptt"])

    @router.post("/collab/ptt/rooms/{id}/talk-request")
    async def create_talk_request(
        id: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        from collab.models.ptt_extended import PTTTalkRequest
        
        request = PTTTalkRequest(
            venue_id=venue_id,
            room_id=id,
            requester_identity_id=current_user["id"]
        )
        
        await db.ptt_talk_requests.insert_one(request.model_dump())
        
        return {"ok": True, "data": request.model_dump()}

    @router.post("/collab/ptt/whisper/start")
    async def start_whisper(
        venue_id: str = Query(...),
        data: dict = {},
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        from collab.models.ptt_extended import PTTWhisperSession
        
        session = PTTWhisperSession(
            venue_id=venue_id,
            from_identity_id=current_user["id"],
            to_identity_id=data.get("to_identity_id")
        )
        
        await db.ptt_whisper_sessions.insert_one(session.model_dump())
        
        return {"ok": True, "data": session.model_dump()}

    return router
