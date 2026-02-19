"""
AI Config Resolver — 3-Level Cascade Configuration
===================================================
Resolves AI config for a venue by merging: System → Group → Venue.
Venue overrides Group, Group overrides System.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from core.database import db

logger = logging.getLogger(__name__)

# Default system config — routes everything to FREE models by default
# No cost until tenant explicitly enables paid models
DEFAULT_SYSTEM_CONFIG = {
    "level": "system",
    "level_id": "",
    "enabled_models": [
        # Google Free
        "gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite",
        # Groq Free (ultra-fast)
        "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768",
        # OpenRouter Free
        "meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-r1:free",
        # Cloudflare Free (edge)
        "@cf/meta/llama-3.1-8b-instruct",
        # HuggingFace Free (NLP)
        "cardiffnlp/twitter-roberta-base-sentiment-latest", "dslim/bert-base-NER",
        # Mistral Free
        "mistral-small-latest",
    ],
    "routing": {
        # All default routes use FREE models — $0 cost
        "analysis": "gemini-2.5-flash",           # Google free tier (5 RPM)
        "strategy": "gemini-2.5-flash",            # Google free tier
        "market": "gemini-2.5-flash",              # Google free tier
        "content": "gemini-2.0-flash",             # Google free tier (15 RPM)
        "studio": "gemini-2.0-flash",              # Google free tier
        "chat": "llama-3.3-70b-versatile",         # Groq free (ultra-fast)
        "voice": "llama-3.1-8b-instant",           # Groq free (lowest latency)
        "copilot": "gemini-2.0-flash",             # Google free tier
        "image": "imagen-4-fast",                  # Google (requires API key)
        "tts": "gemini-2.5-flash-tts",             # Google TTS
        "stt": "nova-2",                           # Deepgram ($200 free credit)
        "embedding": "text-embedding-004",         # Google free tier
        "sentiment": "cardiffnlp/twitter-roberta-base-sentiment-latest",  # HuggingFace free
        "default": "gemini-2.0-flash",             # Google free tier
    },
    "fallback_chains": {
        "text": ["google:gemini-2.0-flash", "groq:llama-3.3-70b-versatile", "openrouter:meta-llama/llama-3.3-70b-instruct:free"],
        "speed": ["groq:llama-3.1-8b-instant", "cloudflare:@cf/meta/llama-3.1-8b-instruct", "google:gemini-2.0-flash-lite"],
        "premium": ["google:gemini-2.5-flash", "mistral:mistral-small-latest", "openrouter:deepseek/deepseek-r1:free"],
    },
    "features": {
        "copilot": True,
        "voice_ai": True,
        "studio": True,
        "radar": True,
        "image_gen": True,
        "tts": False,
        "sentiment_analysis": True,
        "entity_detection": True,
    },
    "limits": {
        "daily_token_limit": 100000,
        "monthly_cost_cap_usd": 0.0,  # $0 — free tier only by default
    },
}


def _deep_merge(base: dict, override: dict) -> dict:
    """Deep merge override into base. Override values win."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        elif value is not None:
            result[key] = value
    return result


async def get_config(level: str, level_id: str = "") -> Optional[dict]:
    """Get a single config by level."""
    doc = await db.ai_model_configs.find_one(
        {"level": level, "level_id": level_id},
        {"_id": 0}
    )
    return doc


async def save_config(level: str, level_id: str, data: dict, user_id: str = "") -> dict:
    """Create or update a config at the given level."""
    now = datetime.now(timezone.utc).isoformat()

    update_data = {
        "level": level,
        "level_id": level_id,
        **{k: v for k, v in data.items() if k not in ("level", "level_id", "_id")},
        "updated_by": user_id,
        "updated_at": now,
    }

    await db.ai_model_configs.update_one(
        {"level": level, "level_id": level_id},
        {"$set": update_data, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    logger.info("AI config saved: level=%s, id=%s, by=%s", level, level_id, user_id)
    return update_data


async def resolve_config(venue_id: str, group_id: str = "") -> dict:
    """
    Resolve final AI config for a venue by cascading:
      System → Group → Venue
    Each level overrides the previous.
    """
    # 1. Start with hardcoded defaults
    resolved = DEFAULT_SYSTEM_CONFIG.copy()

    # 2. Merge system config from DB (if exists)
    system_cfg = await get_config("system", "")
    if system_cfg:
        resolved = _deep_merge(resolved, system_cfg)

    # 3. Merge group config (if group_id provided)
    if group_id:
        group_cfg = await get_config("group", group_id)
        if group_cfg:
            resolved = _deep_merge(resolved, group_cfg)

    # 4. Merge venue config (if exists)
    if venue_id:
        venue_cfg = await get_config("venue", venue_id)
        if venue_cfg:
            resolved = _deep_merge(resolved, venue_cfg)

    # Clean metadata from resolved
    resolved.pop("_id", None)
    resolved["resolved_for"] = venue_id
    resolved["resolved_at"] = datetime.now(timezone.utc).isoformat()

    return resolved


async def get_all_configs() -> list:
    """Get all configs across all levels (for super admin)."""
    cursor = db.ai_model_configs.find({}, {"_id": 0}).sort("level", 1)
    return await cursor.to_list(length=100)
