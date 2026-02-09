"""
📞 Voice AI Routes (Pillar 4) — 24/7 AI Receptionist

Endpoints:
  GET  /api/voice/config          — Get voice config for a venue
  POST /api/voice/config          — Save/update voice configuration
  GET  /api/voice/logs            — Fetch call logs
  POST /api/voice/call/simulate   — Simulate a call with RAG + Gemini
  POST /api/voice/knowledge/upload — Upload PDF to knowledge base
  GET  /api/voice/knowledge       — List knowledge base documents
  GET  /api/voice/stats           — Voice AI analytics
  POST /api/voice/call/live       — Live call webhook (Vapi.ai / Twilio)
"""
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from typing import Optional, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from app.core.database import get_database
import uuid
import logging
import os
import json
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice-ai"])


# ==================== MODELS ====================

class VoiceConfigUpdate(BaseModel):
    persona: Optional[str] = "Professional"
    greeting: Optional[str] = "Good evening, welcome to Restin. How may I assist you today?"
    voice_speed: Optional[float] = 1.0
    auto_reservations: Optional[bool] = True
    call_transfer: Optional[bool] = True
    sms_confirmation: Optional[bool] = True
    language: Optional[str] = "en"
    voice_provider: Optional[str] = "google"  # google | elevenlabs | vapi
    phone_number: Optional[str] = None

    class Config:
        extra = "allow"


class CallSimulation(BaseModel):
    transcript: str

    class Config:
        extra = "allow"


# ==================== CONFIG ====================

@router.get("/config")
async def get_voice_config(venue_id: str = Query(...)):
    """Get voice AI configuration for a venue."""
    db = get_database()
    config = await db.voice_configs.find_one({"venue_id": venue_id})
    if config:
        config["_id"] = str(config["_id"])
        return config

    # Return default config if none exists
    return {
        "venue_id": venue_id,
        "persona": "Professional",
        "greeting": "Good evening, welcome to Restin. How may I assist you today?",
        "voice_speed": 1.0,
        "auto_reservations": True,
        "call_transfer": True,
        "sms_confirmation": True,
        "language": "en",
        "voice_provider": "google",
        "phone_number": "+356 2100 0001",
        "status": "active",
        "knowledge_base": [],
        "total_calls": 0,
        "resolution_rate": 0,
        "avg_response_seconds": 0,
    }


@router.post("/config")
async def update_voice_config(
    config: VoiceConfigUpdate,
    venue_id: str = Query(...),
):
    """Save or update voice AI configuration."""
    db = get_database()
    data = config.dict(exclude_none=True)
    data["venue_id"] = venue_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.voice_configs.update_one(
        {"venue_id": venue_id},
        {"$set": data},
        upsert=True,
    )

    return {"status": "saved", "venue_id": venue_id, "matched": result.matched_count}


# ==================== CALL LOGS ====================

@router.get("/logs")
async def get_call_logs(
    venue_id: str = Query(...),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None),
):
    """Fetch call interaction logs for a venue."""
    db = get_database()
    query: dict[str, Any] = {"venue_id": venue_id}
    if status:
        query["status"] = status

    logs = await db.voice_logs.find(query).sort("created_at", -1).to_list(length=limit)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs


# ==================== RAG SIMULATION ====================

@router.post("/call/simulate")
async def simulate_call(
    body: CallSimulation,
    venue_id: str = Query(...),
):
    """
    Simulate an AI call using RAG:
    1. Fetch venue's knowledge base (menu, policies)
    2. Build context prompt
    3. Call Gemini Flash for response
    4. Log the interaction + track billing
    """
    db = get_database()
    transcript = body.transcript

    # 1. Fetch venue knowledge base
    knowledge_docs = await db.voice_knowledge.find(
        {"venue_id": venue_id, "status": "indexed"}
    ).to_list(length=20)

    knowledge_text = "\n".join([doc.get("content", "") for doc in knowledge_docs])

    # 2. Fetch venue menu items for context
    menu_items = await db.menu_items.find({"venue_id": venue_id}).to_list(length=50)
    menu_text = ", ".join([item.get("name", "") for item in menu_items]) if menu_items else "Menu not available"

    # 3. Fetch venue config
    venue = await db.venues.find_one({"id": venue_id})
    venue_name = venue.get("name", "our restaurant") if venue else "our restaurant"

    # 4. Fetch reservations for today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    reservations = await db.reservations.find({"venue_id": venue_id, "date": today}).to_list(length=20)
    booked_times = [f"{r.get('time', '?')} ({r.get('guest_count', '?')} pax)" for r in reservations]

    # 5. Build RAG prompt
    rag_prompt = f"""You are a 24/7 AI Receptionist for "{venue_name}", a premium restaurant in Malta.

KNOWLEDGE BASE:
{knowledge_text if knowledge_text else "No specific policies uploaded yet."}

MENU HIGHLIGHTS:
{menu_text}

TODAY'S RESERVATIONS:
{', '.join(booked_times) if booked_times else 'Several tables still available'}

CAPABILITIES:
- You can check table availability
- You can create reservations (if auto-reservations enabled)
- You can answer menu questions (allergens, ingredients, prices)
- You can provide opening hours and location info
- If you cannot help, offer to transfer to a human manager

GUEST SAYS: "{transcript}"

Reply naturally, professionally, warmly. Keep it brief (max 3 sentences). If the guest wants to book, confirm date/time/party size."""

    # 6. Call AI (Google Gemini or fallback)
    ai_response = ""
    tokens_used = 0
    ai_provider = "gemini-flash"

    try:
        google_api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if google_api_key:
            import httpx
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={google_api_key}",
                    json={
                        "contents": [{"parts": [{"text": rag_prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "maxOutputTokens": 256,
                        }
                    }
                )
                if resp.status_code == 200:
                    result = resp.json()
                    candidates = result.get("candidates", [])
                    if candidates:
                        ai_response = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        # Estimate tokens for billing
                        tokens_used = len(rag_prompt.split()) + len(ai_response.split())
                else:
                    logger.error(f"Gemini API error: {resp.status_code} {resp.text[:200]}")
        
        if not ai_response:
            # Intelligent fallback without API key
            ai_response = _generate_smart_fallback(transcript, venue_name, menu_text)
            ai_provider = "local-fallback"
            tokens_used = 0

    except Exception as e:
        logger.error(f"Voice AI error: {e}")
        ai_response = _generate_smart_fallback(transcript, venue_name, menu_text)
        ai_provider = "local-fallback"

    # 7. Log the interaction
    call_log = {
        "id": f"call-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "caller": f"+356 {random.randint(7900, 7999)} {random.randint(1000, 9999)}",
        "transcript_in": transcript,
        "transcript_out": ai_response,
        "status": _classify_outcome(ai_response),
        "sentiment": _classify_sentiment(transcript),
        "duration_seconds": random.randint(15, 180),
        "ai_provider": ai_provider,
        "tokens_used": tokens_used,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.voice_logs.insert_one(call_log)
    call_log.pop("_id", None)

    # 8. Track AI usage for billing (Pillar 0)
    if tokens_used > 0:
        await db.ai_usage.insert_one({
            "id": f"usage-{uuid.uuid4().hex[:8]}",
            "venue_id": venue_id,
            "pillar": "voice",
            "provider": ai_provider,
            "tokens_used": tokens_used,
            "cost_cents": max(1, tokens_used // 100),  # ~$0.01 per 100 tokens
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "response": ai_response,
        "call_id": call_log["id"],
        "tokens_used": tokens_used,
        "provider": ai_provider,
        "status": call_log["status"],
    }


# ==================== KNOWLEDGE BASE ====================

@router.post("/knowledge/upload")
async def upload_knowledge(
    venue_id: str = Query(...),
    file: UploadFile = File(...),
):
    """Upload a PDF/document to the voice AI knowledge base."""
    db = get_database()
    content = await file.read()
    
    # Extract text from PDF (basic extraction)
    text_content = ""
    if file.filename and file.filename.endswith(".pdf"):
        try:
            # Try to extract text from PDF using basic methods
            text_content = content.decode("utf-8", errors="ignore")
        except Exception:
            text_content = f"[Binary PDF: {file.filename}, {len(content)} bytes]"
    else:
        try:
            text_content = content.decode("utf-8", errors="ignore")
        except Exception:
            text_content = f"[Binary file: {file.filename}]"

    doc = {
        "id": f"kb-{uuid.uuid4().hex[:8]}",
        "venue_id": venue_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(content),
        "content": text_content[:50000],  # Cap at 50K chars
        "status": "indexed",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.voice_knowledge.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("content", None)  # Don't return full content

    return doc


@router.get("/knowledge")
async def list_knowledge(venue_id: str = Query(...)):
    """List all knowledge base documents for a venue."""
    db = get_database()
    docs = await db.voice_knowledge.find(
        {"venue_id": venue_id},
        {"content": 0}  # Exclude large content field
    ).to_list(length=50)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


@router.delete("/knowledge/{doc_id}")
async def delete_knowledge(doc_id: str):
    """Remove a document from knowledge base."""
    db = get_database()
    await db.voice_knowledge.delete_one({"id": doc_id})
    return {"status": "deleted", "id": doc_id}


# ==================== ANALYTICS ====================

@router.get("/stats")
async def get_voice_stats(venue_id: str = Query(...)):
    """Get voice AI analytics/stats for dashboard."""
    db = get_database()
    
    total_calls = await db.voice_logs.count_documents({"venue_id": venue_id})
    successful = await db.voice_logs.count_documents({"venue_id": venue_id, "status": "BOOKED"})
    escalated = await db.voice_logs.count_documents({"venue_id": venue_id, "status": "Escalated"})
    
    # Get recent logs for avg duration
    recent = await db.voice_logs.find({"venue_id": venue_id}).sort("created_at", -1).to_list(length=100)
    avg_duration = 0
    if recent:
        total_duration = sum(log.get("duration_seconds", 0) for log in recent)
        avg_duration = total_duration // len(recent) if recent else 0

    # Token usage for billing
    total_tokens = 0
    usage_records = await db.ai_usage.find(
        {"venue_id": venue_id, "pillar": "voice"}
    ).to_list(length=1000)
    total_tokens = sum(u.get("tokens_used", 0) for u in usage_records)
    total_cost_cents = sum(u.get("cost_cents", 0) for u in usage_records)

    return {
        "venue_id": venue_id,
        "total_calls": total_calls,
        "resolution_rate": round((successful / max(total_calls, 1)) * 100, 1),
        "escalation_rate": round((escalated / max(total_calls, 1)) * 100, 1),
        "avg_duration_seconds": avg_duration,
        "total_tokens_used": total_tokens,
        "total_cost_cents": total_cost_cents,
        "calls_today": await db.voice_logs.count_documents({
            "venue_id": venue_id,
            "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
        }),
    }


# ==================== LIVE WEBHOOK ====================

@router.post("/call/live")
async def live_call_webhook(body: dict = {}):
    """
    Webhook for live call providers (Vapi.ai / Twilio).
    Receives call events and stores them.
    """
    db = get_database()
    event = {
        "id": f"event-{uuid.uuid4().hex[:8]}",
        "type": body.get("type", "unknown"),
        "payload": body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.voice_events.insert_one(event)
    event.pop("_id", None)
    return {"status": "received", "event_id": event["id"]}


# ==================== SEED DEMO DATA ====================

@router.post("/seed")
async def seed_voice_data(venue_id: str = Query("venue-caviar-bull")):
    """Seed sample voice AI data for demo/testing."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # Seed config
    await db.voice_configs.update_one(
        {"venue_id": venue_id},
        {"$set": {
            "venue_id": venue_id,
            "persona": "British Butler",
            "greeting": "Good evening, welcome to Caviar & Bull. How may I assist you today?",
            "voice_speed": 1.0,
            "auto_reservations": True,
            "call_transfer": True,
            "sms_confirmation": True,
            "language": "en",
            "voice_provider": "google",
            "phone_number": "+356 2100 0001",
            "status": "active",
            "updated_at": now.isoformat(),
        }},
        upsert=True,
    )

    # Seed knowledge base
    kb_docs = [
        {
            "id": "kb-menu-2026",
            "venue_id": venue_id,
            "filename": "Dinner_Menu_Winter_2026.pdf",
            "content_type": "application/pdf",
            "size_bytes": 1258000,
            "content": "DINNER MENU WINTER 2026\n\nSTARTERS:\n- Oscietra Caviar €95 (30g premium Iranian caviar, blinis, crème fraîche)\n- Beef Tartare €28 (hand-cut wagyu, truffle, quail egg)\n- Tuna Tataki €32 (sashimi grade, ponzu, sesame)\n\nMAIN COURSES:\n- Wagyu Ribeye €85 (300g Australian MB9+, bone marrow jus)\n- Dover Sole €72 (whole, meunière butter, capers)\n- Lobster Thermidor €68 (whole Maltese lobster, gruyère)\n\nDESSERTS:\n- Chocolate Sphere €18 (Valrhona 70%, gold leaf)\n- Crème Brûlée €14 (Madagascar vanilla)\n\nALLERGEN INFO: All dishes can be modified for allergies. Please inform your server.\nGLUTEN-FREE: Tartare, Tataki, Ribeye, Sole\nVEGAN: Garden risotto available on request",
            "status": "indexed",
            "uploaded_at": (now - timedelta(days=5)).isoformat(),
        },
        {
            "id": "kb-policy-reserv",
            "venue_id": venue_id,
            "filename": "Reservation_Policy.pdf",
            "content_type": "application/pdf",
            "size_bytes": 412000,
            "content": "RESERVATION POLICY\n\n- Reservations accepted up to 30 days in advance\n- Groups of 8+ require a deposit of €50 per person\n- Cancellation: Free up to 24 hours before\n- Late cancellation: 50% of estimated bill charged\n- No-show: Full estimated bill charged\n- Dress code: Smart casual (no beachwear, no flip-flops)\n- Children welcome, high chairs available\n- Private dining room available for 12-20 guests\n- Opening hours: Tue-Sun 19:00-23:00, Closed Monday\n- Location: Spinola Bay, St Julian's, Malta",
            "status": "indexed",
            "uploaded_at": (now - timedelta(days=10)).isoformat(),
        },
        {
            "id": "kb-allergen",
            "venue_id": venue_id,
            "filename": "Allergen_Guide.pdf",
            "content_type": "application/pdf",
            "size_bytes": 380000,
            "content": "ALLERGEN GUIDE\n\nGluten-free options: Beef Tartare, Wagyu Ribeye, Dover Sole, all salads\nDairy-free options: Tuna Tataki, grilled fish, sorbet\nNut-free: Most dishes (except praline dessert)\nVegan: Garden risotto, mixed salad, sorbet trio\nHalal: All meat is halal certified\nKosher: Not certified but accommodations possible\n\nPlease inform your server of any allergies BEFORE ordering.",
            "status": "indexed",
            "uploaded_at": (now - timedelta(days=3)).isoformat(),
        },
    ]
    await db.voice_knowledge.delete_many({"venue_id": venue_id})
    await db.voice_knowledge.insert_many(kb_docs)

    # Seed call logs
    call_scenarios = [
        ("I'd like to book a table for 4 tonight at 8pm", "Certainly! I have a lovely table available tonight at 8pm for 4 guests. Shall I confirm that for you?", "BOOKED", "positive"),
        ("Do you have any vegan options?", "Absolutely! We offer a garden risotto and a mixed salad, both fully vegan. Our sorbet trio is also vegan-friendly. Would you like to make a reservation?", "Inquiry", "neutral"),
        ("What time do you close?", "We're open Tuesday through Sunday, 19:00 to 23:00. We're closed on Mondays. Would you like to book a table?", "Inquiry", "neutral"),
        ("I need to cancel my reservation for tomorrow", "I understand. Could you provide me with the name on the reservation? Please note that cancellations within 24 hours may incur a charge per our policy.", "Inquiry", "neutral"),
        ("Is the Wagyu steak gluten free?", "Yes! Our Wagyu Ribeye is completely gluten-free. It's a beautiful 300g Australian MB9+ with bone marrow jus. Would you like to reserve a table to try it?", "Inquiry", "positive"),
        ("I want to speak to the manager!", "Of course, I'll transfer you to our manager right away. One moment please.", "Escalated", "negative"),
        ("Can I book a private dining room for 15 people next Saturday?", "Wonderful! Our private dining room accommodates 12-20 guests. For groups of 8 or more, we require a €50 deposit per person. Shall I reserve it for next Saturday?", "BOOKED", "positive"),
        ("Do you have parking?", "We're located at Spinola Bay, St Julian's. While we don't have private parking, there's a public car park nearby. Shall I book a table for you?", "Inquiry", "neutral"),
    ]

    logs = []
    for i, (q, a, status, sentiment) in enumerate(call_scenarios):
        log_time = now - timedelta(hours=random.randint(1, 72))
        logs.append({
            "id": f"call-demo-{i+1:03d}",
            "venue_id": venue_id,
            "caller": f"+356 {random.randint(7900, 7999)} {random.randint(1000, 9999)}",
            "transcript_in": q,
            "transcript_out": a,
            "status": status,
            "sentiment": sentiment,
            "duration_seconds": random.randint(15, 180),
            "ai_provider": "gemini-flash",
            "tokens_used": random.randint(80, 300),
            "created_at": log_time.isoformat(),
        })

    await db.voice_logs.delete_many({"venue_id": venue_id})
    await db.voice_logs.insert_many(logs)

    return {
        "status": "seeded",
        "config": 1,
        "knowledge_docs": len(kb_docs),
        "call_logs": len(logs),
    }


# ==================== HELPER FUNCTIONS ====================

def _generate_smart_fallback(transcript: str, venue_name: str, menu_text: str) -> str:
    """Generate an intelligent response without API key."""
    transcript_lower = transcript.lower()

    if any(w in transcript_lower for w in ["book", "reserve", "table", "reservation"]):
        return f"I'd be happy to help you with a reservation at {venue_name}. Could you let me know the date, time, and number of guests? I'll check our availability right away."

    if any(w in transcript_lower for w in ["menu", "eat", "food", "dish", "special"]):
        items = menu_text[:200] if menu_text != "Menu not available" else "a wonderful selection of fine dining options"
        return f"Our current menu features {items}. Would you like me to book a table so you can enjoy them?"

    if any(w in transcript_lower for w in ["vegan", "vegetarian", "gluten", "allergy", "allergen", "dairy"]):
        return "We accommodate all dietary requirements including vegan, gluten-free, and dairy-free options. Please let your server know about any allergies when you arrive. Shall I book a table?"

    if any(w in transcript_lower for w in ["open", "close", "hour", "time", "when"]):
        return f"We're open Tuesday through Sunday, from 7pm to 11pm. We're closed on Mondays. Would you like to make a reservation?"

    if any(w in transcript_lower for w in ["where", "location", "address", "park", "direction"]):
        return f"{venue_name} is located at Spinola Bay, St Julian's, Malta. Public parking is available nearby. Shall I reserve a table for you?"

    if any(w in transcript_lower for w in ["cancel", "change", "modify"]):
        return "I can help with that. Could you provide the name on the reservation? Please note our 24-hour cancellation policy."

    if any(w in transcript_lower for w in ["manager", "complaint", "speak", "human"]):
        return "I understand. Let me transfer you to our manager right away. One moment please."

    if any(w in transcript_lower for w in ["price", "cost", "expensive", "cheap", "budget"]):
        return f"Our menu ranges from €14 for desserts to €95 for our premium caviar. We'd love to welcome you — shall I check availability for a table?"

    return f"Thank you for calling {venue_name}. I'd be happy to help with reservations, menu inquiries, or any other questions. What can I assist you with?"


def _classify_outcome(response: str) -> str:
    """Classify the call outcome based on AI response."""
    response_lower = response.lower()
    if any(w in response_lower for w in ["confirm", "book", "reserve", "reserved"]):
        return "BOOKED"
    if any(w in response_lower for w in ["transfer", "manager", "escalat"]):
        return "Escalated"
    return "Inquiry"


def _classify_sentiment(transcript: str) -> str:
    """Classify caller sentiment based on transcript."""
    transcript_lower = transcript.lower()
    if any(w in transcript_lower for w in ["complaint", "angry", "terrible", "worst", "manager"]):
        return "negative"
    if any(w in transcript_lower for w in ["love", "great", "wonderful", "amazing", "thank"]):
        return "positive"
    return "neutral"
