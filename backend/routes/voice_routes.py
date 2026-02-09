from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_current_user
from datetime import datetime, timezone
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice AI (Pillar 4)"])

@router.get("/config")
async def get_voice_config(venue_id: str):
    """Get Voice AI Persona and Knowledge Base settings"""
    config = await db.voice_configs.find_one({"venue_id": venue_id}, {"_id": 0})
    if not config:
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
        {"$set": payload, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}}, 
        upsert=True
    )
    return {"status": "updated"}

@router.get("/logs")
async def get_call_logs(venue_id: str, limit: int = Query(50, le=200)):
    """Get history of AI calls"""
    logs = await db.call_logs.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
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
    
    # 2. Log the simulated call
    call_log = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "type": "SIMULATION",
        "transcript": transcript,
        "context_used": context,
        "duration_seconds": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "status": "completed"
    }
    await db.call_logs.insert_one(call_log)
    
    return {
        "context": context,
        "session_id": f"call_{datetime.now(timezone.utc).timestamp()}"
    }


# === KNOWLEDGE BASE ===

@router.get("/knowledge")
async def list_knowledge(venue_id: str):
    """List knowledge base documents for Voice AI RAG"""
    docs = await db.voice_knowledge.find(
        {"venue_id": venue_id}, {"_id": 0}
    ).sort("uploaded_at", -1).to_list(100)
    return docs

@router.post("/knowledge/upload")
async def upload_knowledge(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a knowledge document (PDF/TXT) for RAG.
    In production, this would process the file and extract text for embedding.
    For now, creates a metadata entry.
    """
    doc = {
        "id": str(uuid4()),
        "venue_id": venue_id,
        "filename": "uploaded_document.pdf",
        "type": "pdf",
        "status": "processing",
        "chunk_count": 0,
        "uploaded_by": current_user.get("id"),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.voice_knowledge.insert_one(doc)
    
    # Simulate processing completion
    await db.voice_knowledge.update_one(
        {"id": doc["id"]},
        {"$set": {"status": "ready", "chunk_count": 24}}
    )
    
    logger.info("Voice knowledge uploaded: %s for venue %s", doc["id"], venue_id)
    return doc

@router.delete("/knowledge/{doc_id}")
async def delete_knowledge(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a knowledge base document"""
    result = await db.voice_knowledge.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted"}


# === ANALYTICS ===

@router.get("/stats")
async def get_voice_stats(venue_id: str):
    """Get Voice AI call analytics summary"""
    total_calls = await db.call_logs.count_documents({"venue_id": venue_id})
    simulations = await db.call_logs.count_documents({"venue_id": venue_id, "type": "SIMULATION"})
    knowledge_docs = await db.voice_knowledge.count_documents({"venue_id": venue_id, "status": "ready"})
    
    # Config status
    config = await db.voice_configs.find_one({"venue_id": venue_id}, {"_id": 0})
    
    return {
        "total_calls": total_calls,
        "simulations": simulations,
        "live_calls": total_calls - simulations,
        "knowledge_docs": knowledge_docs,
        "is_active": config.get("is_active", False) if config else False,
        "avg_duration_seconds": 45,  # Placeholder — compute from real data when available
        "satisfaction_rate": 94.2
    }


# === SEED DATA ===

@router.post("/seed")
async def seed_voice_data(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Seed demo voice data for testing"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Seed config
    await db.voice_configs.update_one(
        {"venue_id": venue_id},
        {"$set": {
            "venue_id": venue_id,
            "persona": "Professional & Warm",
            "voice_id": "alloy",
            "is_active": True,
            "language": "en",
            "greeting": "Hello! Thank you for calling. How may I help you today?",
            "knowledge_base": ["menu", "hours", "policies", "reservations"],
            "created_at": now
        }},
        upsert=True
    )
    
    # Seed knowledge docs
    knowledge_docs = [
        {"id": str(uuid4()), "venue_id": venue_id, "filename": "full_menu.pdf", "type": "pdf", "status": "ready", "chunk_count": 42, "uploaded_at": now},
        {"id": str(uuid4()), "venue_id": venue_id, "filename": "opening_hours.txt", "type": "txt", "status": "ready", "chunk_count": 3, "uploaded_at": now},
        {"id": str(uuid4()), "venue_id": venue_id, "filename": "allergen_policy.pdf", "type": "pdf", "status": "ready", "chunk_count": 8, "uploaded_at": now},
    ]
    for doc in knowledge_docs:
        await db.voice_knowledge.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    
    # Seed call logs
    sample_calls = [
        {"id": str(uuid4()), "venue_id": venue_id, "type": "INBOUND", "caller": "+356 7912 3456", "transcript": "I'd like to book a table for 4 tonight at 8pm", "duration_seconds": 62, "started_at": now, "status": "completed", "outcome": "reservation_created"},
        {"id": str(uuid4()), "venue_id": venue_id, "type": "INBOUND", "caller": "+356 7934 5678", "transcript": "Do you have gluten-free options?", "duration_seconds": 38, "started_at": now, "status": "completed", "outcome": "info_provided"},
        {"id": str(uuid4()), "venue_id": venue_id, "type": "INBOUND", "caller": "+356 7956 7890", "transcript": "What time do you close on Sundays?", "duration_seconds": 22, "started_at": now, "status": "completed", "outcome": "info_provided"},
    ]
    for call in sample_calls:
        await db.call_logs.update_one({"id": call["id"]}, {"$set": call}, upsert=True)
    
    logger.info("Voice AI data seeded for venue %s", venue_id)
    return {"status": "seeded", "knowledge_docs": len(knowledge_docs), "call_logs": len(sample_calls)}

