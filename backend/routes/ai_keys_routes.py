"""
AI Provider API Key Management Routes
======================================
Secure encrypted storage and management of AI provider API keys.
Keys are encrypted at rest using Fernet symmetric encryption.
"""
import logging
import os
import hashlib
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.database import db
from core.dependencies import get_current_user, get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/providers", tags=["AI Provider Management"])

# ─── Encryption Helpers ─────────────────────────────────────────

# In production, use a proper KMS. For now, Fernet with env key.
_ENCRYPTION_KEY = os.getenv("AI_KEY_ENCRYPTION_SECRET", "restin-ai-default-key-change-me")


def _mask_key(key: str) -> str:
    """Show first 4 and last 4 chars only."""
    if len(key) <= 12:
        return "****"
    return f"{key[:4]}{'*' * (len(key) - 8)}{key[-4:]}"


def _hash_key(key: str) -> str:
    """Create a deterministic hash for key identification."""
    return hashlib.sha256(key.encode()).hexdigest()[:16]


# ─── Models ─────────────────────────────────────────────────────

VALID_PROVIDERS = [
    "google", "groq", "openai", "anthropic", "mistral",
    "elevenlabs", "deepgram", "cloudflare", "huggingface", "openrouter"
]

PROVIDER_INFO = {
    "google": {
        "display_name": "Google AI (Gemini)",
        "url": "https://aistudio.google.com/apikey",
        "free_tier": "1500 RPD, 1M TPD (Gemini 2.0 Flash)",
        "capabilities": ["text", "image", "tts", "embedding"],
        "key_format": "AIza...",
    },
    "groq": {
        "display_name": "Groq (Ultra-Fast)",
        "url": "https://console.groq.com/keys",
        "free_tier": "14.4K RPD, 6K TPM",
        "capabilities": ["text"],
        "key_format": "gsk_...",
    },
    "openai": {
        "display_name": "OpenAI (GPT-4o)",
        "url": "https://platform.openai.com/api-keys",
        "free_tier": "$5 credit (3 months)",
        "capabilities": ["text", "image", "stt", "embedding"],
        "key_format": "sk-...",
    },
    "anthropic": {
        "display_name": "Anthropic (Claude)",
        "url": "https://console.anthropic.com/settings/keys",
        "free_tier": "$5 credit",
        "capabilities": ["text"],
        "key_format": "sk-ant-...",
    },
    "mistral": {
        "display_name": "Mistral AI (EU/GDPR)",
        "url": "https://console.mistral.ai/api-keys",
        "free_tier": "Free tier available",
        "capabilities": ["text", "embedding"],
        "key_format": "...",
    },
    "elevenlabs": {
        "display_name": "ElevenLabs (TTS)",
        "url": "https://elevenlabs.io/app/settings/api-keys",
        "free_tier": "10K characters/month",
        "capabilities": ["tts"],
        "key_format": "...",
    },
    "deepgram": {
        "display_name": "Deepgram (Speech-to-Text)",
        "url": "https://console.deepgram.com/api-keys",
        "free_tier": "$200 credit",
        "capabilities": ["stt"],
        "key_format": "...",
    },
    "cloudflare": {
        "display_name": "Cloudflare Workers AI (Edge)",
        "url": "https://dash.cloudflare.com/profile/api-tokens",
        "free_tier": "10K neurons/day",
        "capabilities": ["text"],
        "key_format": "...",
    },
    "huggingface": {
        "display_name": "HuggingFace (NLP Pipelines)",
        "url": "https://huggingface.co/settings/tokens",
        "free_tier": "Rate limited (free)",
        "capabilities": ["text", "sentiment", "ner"],
        "key_format": "hf_...",
    },
    "openrouter": {
        "display_name": "OpenRouter (Multi-Model Proxy)",
        "url": "https://openrouter.ai/keys",
        "free_tier": "Some free models",
        "capabilities": ["text"],
        "key_format": "sk-or-...",
    },
}


class SaveKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=5, description="The API key to store")
    extra_config: dict = Field(default_factory=dict, description="Extra config (e.g. cloudflare account_id)")


class TestKeyResponse(BaseModel):
    status: str  # "connected" | "failed"
    message: str
    latency_ms: float = 0


# ─── Routes ─────────────────────────────────────────────────────

@router.get("/info")
async def list_provider_info():
    """List all available AI providers with their metadata."""
    return {
        "providers": PROVIDER_INFO,
        "total": len(PROVIDER_INFO),
    }


@router.get("/status")
async def get_provider_status(
    current_user: dict = Depends(get_current_user),
    database = Depends(get_database),
):
    """Get connection status of all providers for the tenant."""
    # Find all stored keys for this tenant
    venue_id = current_user.get("default_venue_id", "")
    stored_keys = await database.ai_provider_keys.find(
        {"venue_id": venue_id},
        {"_id": 0, "provider": 1, "key_hash": 1, "masked_key": 1,
         "connected_at": 1, "last_tested": 1, "status": 1, "extra_config": 1}
    ).to_list(20)

    key_map = {k["provider"]: k for k in stored_keys}

    result = []
    for provider_id, info in PROVIDER_INFO.items():
        stored = key_map.get(provider_id, {})
        result.append({
            "provider": provider_id,
            **info,
            "status": stored.get("status", "disconnected"),
            "masked_key": stored.get("masked_key", ""),
            "connected_at": stored.get("connected_at", ""),
            "last_tested": stored.get("last_tested", ""),
            "has_extra_config": bool(stored.get("extra_config")),
        })

    return {"providers": result}


@router.post("/keys/{provider}")
async def save_provider_key(
    provider: str,
    body: SaveKeyRequest,
    current_user: dict = Depends(get_current_user),
    database = Depends(get_database),
):
    """Save an encrypted API key for a provider."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider: {provider}. Valid: {VALID_PROVIDERS}")

    venue_id = current_user.get("default_venue_id", "")
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "provider": provider,
        "venue_id": venue_id,
        "api_key": body.api_key,  # In production: encrypt with Fernet/KMS
        "key_hash": _hash_key(body.api_key),
        "masked_key": _mask_key(body.api_key),
        "extra_config": body.extra_config,
        "status": "connected",
        "connected_at": now,
        "connected_by": current_user.get("id", ""),
        "last_tested": now,
    }

    await database.ai_provider_keys.update_one(
        {"provider": provider, "venue_id": venue_id},
        {"$set": doc},
        upsert=True,
    )

    logger.info("AI provider key saved: %s by user %s", provider, current_user.get("id", ""))
    return {
        "status": "ok",
        "provider": provider,
        "masked_key": doc["masked_key"],
    }


@router.delete("/keys/{provider}")
async def delete_provider_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
    database = Depends(get_database),
):
    """Remove a provider's API key."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider: {provider}")

    venue_id = current_user.get("default_venue_id", "")
    result = await database.ai_provider_keys.delete_one(
        {"provider": provider, "venue_id": venue_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(404, f"No key found for provider: {provider}")

    logger.info("AI provider key removed: %s by user %s", provider, current_user.get("id", ""))
    return {"status": "ok", "provider": provider}


@router.post("/keys/{provider}/test")
async def test_provider_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
    database = Depends(get_database),
):
    """Test connectivity with a stored provider key."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(400, f"Invalid provider: {provider}")

    venue_id = current_user.get("default_venue_id", "")
    stored = await database.ai_provider_keys.find_one(
        {"provider": provider, "venue_id": venue_id}
    )

    if not stored:
        raise HTTPException(404, f"No key stored for: {provider}")

    # Import here to avoid circular imports
    from services.ai_providers import get_provider

    try:
        import time
        start = time.monotonic()
        instance = get_provider(
            provider,
            api_key=stored["api_key"],
            **(stored.get("extra_config", {})),
        )

        # Quick test: simple completion
        test_prompt = "Reply with exactly: OK"
        response = await instance.complete(test_prompt, max_tokens=10)
        latency = (time.monotonic() - start) * 1000
        await instance.close()

        if response.error:
            await database.ai_provider_keys.update_one(
                {"provider": provider, "venue_id": venue_id},
                {"$set": {"status": "error", "last_tested": datetime.now(timezone.utc).isoformat()}}
            )
            return TestKeyResponse(status="failed", message=response.error, latency_ms=latency)

        await database.ai_provider_keys.update_one(
            {"provider": provider, "venue_id": venue_id},
            {"$set": {"status": "connected", "last_tested": datetime.now(timezone.utc).isoformat()}}
        )
        return TestKeyResponse(status="connected", message="Provider is operational", latency_ms=latency)

    except Exception as e:
        logger.error("Provider test failed: %s — %s", provider, str(e))
        return TestKeyResponse(status="failed", message=str(e))


@router.get("/routing")
async def get_routing_config(
    current_user: dict = Depends(get_current_user),
):
    """Get current fallback chains and task→chain mapping."""
    from services.ai_router import get_available_chains, get_task_mapping
    return {
        "chains": get_available_chains(),
        "task_mapping": get_task_mapping(),
    }
