from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/voice", tags=["Voice AI (Pillar 4)"])

@router.get("/config")
async def get_voice_config(venue_id: str):
    """Get Voice AI Persona and Knowledge Base settings"""
    config = await db.voice_configs.find_one({"venue_id": venue_id}, {"_id": 0})
    if not config:
        # Return default config if none exists
        return {
            "venue_id": venue_id,
            "persona": "Professional",
            "voice_id": "alloy",
            "is_active": False,
            "knowledge_base": ["menu", "hours"]
        }
    return config

@router.post("/config")
async def update_voice_config(
    venue_id: str, 
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Update Voice AI Settings"""
    await db.voice_configs.update_one(
        {"venue_id": venue_id}, 
        {"$set": payload, "$setOnInsert": {"created_at": datetime.now()}}, 
        upsert=True
    )
    return {"status": "updated"}

@router.get("/logs")
async def get_call_logs(venue_id: str):
    """Get history of AI calls"""
    logs = await db.call_logs.find(
        {"venue_id": venue_id}
    ).sort("started_at", -1).limit(50).to_list(50)
    return logs

@router.post("/call/simulate")
async def simulate_inbound_call(
    venue_id: str,
    payload: Dict[str, Any] = Body(...)
):
    """
    Simulate an inbound call for testing the RAG system.
    In prod, this would be a Twilio/Vapi webhook.
    """
    transcript = payload.get("transcript")
    
    # 1. Fetch Knowledge (RAG) - Mocking simple retrieval
    menu = await db.menus.find_one({"venue_id": venue_id, "is_active": True})
    menu_items = [item["name"] for item in await db.menu_items.find({"venue_id": venue_id, "is_active": True}).limit(5).to_list(5)]
    
    context = {
        "menu_items": menu_items,
        "availability": "Tables available for dinner tonight.",
        "policies": ["No pets allowed inside", "Dress code: Smart Casual"]
    }
    
    # 2. Return context for the Frontend AI Agent to process
    return {
        "context": context,
        "session_id": f"call_{datetime.now().timestamp()}"
    }
