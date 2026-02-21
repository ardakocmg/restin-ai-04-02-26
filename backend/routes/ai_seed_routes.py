"""
AI Free Model Seeder — Maps Free Models to System + Existing Venues
====================================================================
Seeds the AI config so ALL existing venues use free models by default.
Cost: $0. No API keys needed for Groq, OpenRouter, Cloudflare, HuggingFace.

Usage:
  POST /api/ai/providers/seed-free
"""
from fastapi import APIRouter, Depends
from core.database import get_database
from core.dependencies import get_current_user
from services.ai_config_resolver import DEFAULT_SYSTEM_CONFIG
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/seed", tags=["AI Provider Setup"])


# Free providers that need NO API key (or have free tier with key)
FREE_PROVIDER_INFO = {
    "groq": {
        "display_name": "Groq",
        "url": "https://console.groq.com/keys",
        "signup": "Free account, no credit card",
        "free_tier": "All models free — 14,400 RPD, 30 RPM",
        "api_url": "https://api.groq.com/openai/v1",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    },
    "google": {
        "display_name": "Google AI Studio",
        "url": "https://aistudio.google.com/apikey",
        "signup": "Free with Google account, no credit card",
        "free_tier": "Gemini 2.0 Flash: 15 RPM, 1500 RPD. Gemini 2.5 Flash: 5 RPM, 100 RPD",
        "api_url": "https://generativelanguage.googleapis.com/v1beta",
        "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "text-embedding-004"],
    },
    "openrouter": {
        "display_name": "OpenRouter",
        "url": "https://openrouter.ai/settings/keys",
        "signup": "Free account via Google/Github",
        "free_tier": "50 RPD free (1000 RPD with $10+ credit). 18+ free models.",
        "api_url": "https://openrouter.ai/api/v1",
        "models": [
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1:free",
            "deepseek/deepseek-r1-0528:free",
            "meta-llama/llama-4-maverick:free",
            "meta-llama/llama-4-scout:free",
            "nvidia/nemotron-nano-12b-2-vl:free",
            "openai/gpt-oss-20b:free",
            "google/gemini-2.0-flash-exp:free",
        ],
    },
    "cloudflare": {
        "display_name": "Cloudflare Workers AI",
        "url": "https://dash.cloudflare.com/",
        "signup": "Free account",
        "free_tier": "10,000 neurons/day free",
        "api_url": "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run",
        "models": ["@cf/meta/llama-3.1-8b-instruct", "@cf/mistral/mistral-7b-instruct-v0.2"],
    },
    "huggingface": {
        "display_name": "HuggingFace Inference",
        "url": "https://huggingface.co/settings/tokens",
        "signup": "Free account",
        "free_tier": "Rate-limited inference — sentiment & NER free",
        "api_url": "https://api-inference.huggingface.co/models",
        "models": ["cardiffnlp/twitter-roberta-base-sentiment-latest", "dslim/bert-base-NER"],
    },
    "mistral": {
        "display_name": "Mistral AI",
        "url": "https://console.mistral.ai/api-keys",
        "signup": "Free tier available, EU/GDPR compliant",
        "free_tier": "mistral-small-latest free, mistral-embed free",
        "api_url": "https://api.mistral.ai/v1",
        "models": ["mistral-small-latest", "mistral-embed"],
    },
}


@router.post("/seed-free")
async def seed_free_model_config(current_user: dict = Depends(get_current_user)):
    """
    Seed ALL existing venues with free-model-only AI config.
    Cost: $0. Safe to run multiple times (upserts).
    """
    role = current_user.get("role", "")
    if role not in ("product_owner", "super_admin", "admin"):
        return {"error": "Unauthorized. Admin required."}

    db = get_database()
    now = datetime.now(timezone.utc).isoformat()
    user_id = current_user.get("id", "system")
    venues_seeded_list = []
    system_seeded = False
    # 1. Seed system-level config (applies to ALL venues via cascade)
    await db.ai_model_configs.update_one(
        {"level": "system", "level_id": ""},
        {
            "$set": {
                **DEFAULT_SYSTEM_CONFIG,
                "updated_by": user_id,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    system_seeded = True
    logger.info("AI system config seeded with free models by %s", user_id)

    # 2. Find all existing venues and seed venue-level configs
    venues = await db.venues.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)

    for venue in venues:
        venue_id = venue.get("id", "")
        if not venue_id:
            continue

        venue_config = {
            "level": "venue",
            "level_id": venue_id,
            "venue_name": venue.get("name", ""),
            # Inherit everything from system config — but allow venue overrides later
            "routing_override": {},  # Empty = use system defaults (all free)
            "enabled_models_override": [],  # Empty = use system defaults
            "cost_cap_usd": 0.0,  # $0 for all venues by default
            "ai_enabled": True,
            "updated_by": user_id,
            "updated_at": now,
        }

        await db.ai_model_configs.update_one(
            {"level": "venue", "level_id": venue_id},
            {"$set": venue_config, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        venues_seeded_list.append({"id": venue_id, "name": venue.get("name", ""), "status": "seeded"})

    logger.info("AI config seeded for %d venues (free models only)", len(venues_seeded_list))

    return {
        "status": "success",
        "message": f"Seeded system config + {len(venues_seeded_list)} venues with FREE models ($0 cost)",
        "system_config_applied": True,
        "venues_seeded": len(venues_seeded_list),
        "venues": venues_seeded_list,
        "free_providers": list(FREE_PROVIDER_INFO.keys()),
        "how_to_connect": {
            provider: {
                "display_name": info["display_name"],
                "get_key_at": info["url"],
                "signup": info["signup"],
                "free_tier": info["free_tier"],
            }
            for provider, info in FREE_PROVIDER_INFO.items()
        },
    }


@router.get("/free-setup-guide")
async def get_free_setup_guide():
    """
    Return a guide for setting up free AI providers.
    No auth required — this is informational.
    """
    return {
        "title": "Restin.AI — Free AI Setup Guide",
        "total_free_models": 20,
        "monthly_cost": "$0",
        "providers": [
            {
                "name": info["display_name"],
                "priority": idx + 1,
                "get_key_at": info["url"],
                "signup_effort": info["signup"],
                "free_tier": info["free_tier"],
                "models_count": len(info["models"]),
                "models": info["models"],
                "recommended_for": _get_recommendation(provider),
            }
            for idx, (provider, info) in enumerate(FREE_PROVIDER_INFO.items())
        ],
        "quick_start": [
            "1. Go to https://aistudio.google.com/apikey — get a Gemini key (30 sec)",
            "2. Go to https://console.groq.com/keys — get a Groq key (30 sec)",
            "3. Go to https://openrouter.ai/settings/keys — get OpenRouter key (30 sec)",
            "4. Save keys via Settings > AI Providers in Restin.AI",
            "5. Done! All AI features now work at $0 cost.",
        ],
    }


def _get_recommendation(provider: str) -> str:
    """Get what each provider is best for."""
    recs = {
        "groq": "Chat & Voice (ultra-fast, <100ms latency)",
        "google": "Analysis, Strategy, Content, Embeddings (free + powerful)",
        "openrouter": "Fallback text completion (18+ free models)",
        "cloudflare": "Edge inference (low latency, privacy)",
        "huggingface": "Sentiment analysis, allergen detection (NLP)",
        "mistral": "EU/GDPR compliance, code generation",
    }
    return recs.get(provider, "General purpose")
