"""Chat & Team Communication Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access

def create_chat_router():
    router = APIRouter(tags=["chat"])

    @router.get("/venues/{venue_id}/chat/channels")
    async def get_channels(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        # Static channels for now + dynamic ones could be added
        return [
            {"id": "general", "name": "# General", "type": "public"},
            {"id": "kitchen", "name": "# Kitchen", "type": "public"},
            {"id": "service", "name": "# Service", "type": "public"},
            {"id": "ai-copilot", "name": "✨ AI Copilot", "type": "private", "access": ["MANAGER", "OWNER"]},
            {"id": "managers", "name": "# Managers", "type": "private", "access": ["MANAGER", "OWNER"]}
        ]

    @router.get("/venues/{venue_id}/chat/messages")
    async def get_messages(
        venue_id: str,
        channel_id: str,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id, "channel_id": channel_id}
        messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return messages[::-1] # Return chronological

    @router.post("/venues/{venue_id}/chat/messages")
    async def send_message(
        venue_id: str,
        data: dict, # { channel_id, content, type: "text"|"voice" }
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        msg = {
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "channel_id": data["channel_id"],
            "user_id": current_user["id"],
            "user_name": current_user["name"],
            "content": data["content"],
            "type": data.get("type", "text"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.chat_messages.insert_one(msg)

        # AI Interception
        if data["channel_id"] == "ai-copilot":
            from services.ai_agent import ai_agent
            response_text = await ai_agent.ask(venue_id, data["content"])
            
            ai_msg = {
                "id": str(uuid.uuid4()),
                "venue_id": venue_id,
                "channel_id": "ai-copilot",
                "user_id": "system_ai",
                "user_name": "Restin AI",
                "content": response_text,
                "type": "text",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.chat_messages.insert_one(ai_msg)
            return [msg, ai_msg] # Return both

        return msg

    return router
