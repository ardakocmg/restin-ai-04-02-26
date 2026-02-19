"""
Shadow Learning Engine — Parallel Free Model Fan-Out
=====================================================
Every AI call is also sent to free/unlimited models in the background.
Responses are stored in `ai_shadow_logs` for quality comparison and learning.

Architecture:
  1. Primary model returns immediately to user
  2. Background task fans out to 2-3 high-quota free models
  3. All responses stored with quality metrics for comparison

Highest-Quota Free Models (used as shadow targets):
  - Groq llama-3.1-8b-instant:  14.4K RPD (highest daily quota)
  - Groq llama-4-scout-17b:     30K TPM  (highest throughput)
  - OpenRouter gemma-3-27b:free  200 RPD  (good quality Google model)
"""
import asyncio
import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Optional, Dict, List

from core.database import db

logger = logging.getLogger(__name__)


# ─── Shadow Target Configuration ──────────────────────────────

# Models selected for highest free quota + quality diversity
SHADOW_TARGETS = [
    # Provider, Model ID, Description
    ("groq", "llama-3.1-8b-instant", "Fast 8B — 14.4K RPD"),
    ("groq", "meta-llama/llama-4-scout-17b-16e-instruct", "Llama 4 Scout — 30K TPM"),
    ("openrouter", "google/gemma-3-27b-it:free", "Gemma 3 27B — Google quality"),
]

# Max shadow targets per request (to avoid excessive load)
MAX_SHADOWS_PER_REQUEST = 3

# Skip shadow for very short prompts (not worth the compute)
MIN_PROMPT_LENGTH = 20

# Max prompt length to send to shadow (truncate very long prompts)
MAX_PROMPT_LENGTH = 4000

# Rate limiting: max shadow requests per minute (avoid quota exhaustion)
_shadow_count_this_minute = 0
_shadow_minute_marker = 0
MAX_SHADOWS_PER_MINUTE = 30


# ─── Core Shadow Engine ──────────────────────────────────────

async def shadow_fanout(
    prompt: str,
    system_prompt: str,
    primary_response: str,
    primary_provider: str,
    primary_model: str,
    primary_latency_ms: float,
    primary_tokens: int,
    task_type: str = "chat",
    venue_id: str = "",
) -> None:
    """Fire-and-forget: send prompt to free shadow models and log all responses.
    
    Called via asyncio.create_task() — does NOT block the primary response.
    """
    global _shadow_count_this_minute, _shadow_minute_marker

    # Skip conditions
    if len(prompt) < MIN_PROMPT_LENGTH:
        return

    # Rate limiting
    current_minute = int(time.time() / 60)
    if current_minute != _shadow_minute_marker:
        _shadow_minute_marker = current_minute
        _shadow_count_this_minute = 0

    if _shadow_count_this_minute >= MAX_SHADOWS_PER_MINUTE:
        logger.debug("Shadow rate limit hit (%d/min), skipping", MAX_SHADOWS_PER_MINUTE)
        return

    # Truncate very long prompts
    shadow_prompt = prompt[:MAX_PROMPT_LENGTH]
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]

    # Prepare shadow tasks
    shadow_results = []
    tasks = []

    for provider, model, description in SHADOW_TARGETS[:MAX_SHADOWS_PER_REQUEST]:
        _shadow_count_this_minute += 1
        tasks.append(_call_shadow_model(provider, model, shadow_prompt, system_prompt))

    # Execute all shadows in parallel
    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            provider, model, desc = SHADOW_TARGETS[i]
            if isinstance(result, Exception):
                shadow_results.append({
                    "provider": provider,
                    "model": model,
                    "error": str(result)[:200],
                    "latency_ms": 0,
                    "tokens_est": 0,
                })
            else:
                shadow_results.append(result)

    except Exception as e:
        logger.error("Shadow fanout error: %s", str(e)[:100])
        return

    # Calculate quality metrics
    quality = _compute_quality_metrics(primary_response, shadow_results)

    # Store everything in MongoDB
    try:
        doc = {
            "prompt_hash": prompt_hash,
            "prompt_preview": prompt[:200],
            "system_prompt_preview": system_prompt[:100] if system_prompt else "",
            "task_type": task_type,
            "venue_id": venue_id,
            "primary": {
                "provider": primary_provider,
                "model": primary_model,
                "response_preview": primary_response[:500],
                "response_length": len(primary_response),
                "latency_ms": round(primary_latency_ms, 1),
                "tokens_est": primary_tokens,
            },
            "shadows": shadow_results,
            "quality": quality,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.ai_shadow_logs.insert_one(doc)
        logger.info(
            "🔮 Shadow logged: %s → %d shadows (%s)",
            primary_model,
            len([s for s in shadow_results if "error" not in s]),
            prompt_hash,
        )
    except Exception as e:
        logger.error("Shadow log save error: %s", str(e)[:100])


async def _call_shadow_model(
    provider: str,
    model: str,
    prompt: str,
    system_prompt: str,
) -> Dict:
    """Call a single shadow model and return the result dict."""
    from services.ai_providers import get_provider, GeminiSDKProvider
    from services.ai_router import _load_env_keys, _get_google_key_rotated

    start = time.monotonic()

    # Get provider instance
    env_keys = _load_env_keys()

    if provider == "google":
        api_key = _get_google_key_rotated()
    else:
        api_key = env_keys.get(provider, "")

    if not api_key:
        return {
            "provider": provider,
            "model": model,
            "error": f"No API key for {provider}",
            "latency_ms": 0,
            "tokens_est": 0,
        }

    try:
        instance = get_provider(provider, api_key)
        result = await asyncio.wait_for(
            instance.complete(
                prompt=prompt,
                model=model,
                system_prompt=system_prompt,
                max_tokens=512,  # Keep shadow responses short
                temperature=0.7,
            ),
            timeout=15.0,  # 15s timeout for shadows
        )

        latency = (time.monotonic() - start) * 1000
        response_text = result.text if result.text else ""

        return {
            "provider": provider,
            "model": model,
            "response_preview": response_text[:500],
            "response_length": len(response_text),
            "latency_ms": round(latency, 1),
            "tokens_est": (len(prompt) + len(response_text)) // 4,
        }

    except asyncio.TimeoutError:
        return {
            "provider": provider,
            "model": model,
            "error": "Timeout (15s)",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
            "tokens_est": 0,
        }
    except Exception as e:
        return {
            "provider": provider,
            "model": model,
            "error": str(e)[:200],
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
            "tokens_est": 0,
        }


def _compute_quality_metrics(primary: str, shadows: List[Dict]) -> Dict:
    """Compare shadow responses against primary for quality analysis."""
    if not primary or not shadows:
        return {}

    primary_words = set(primary.lower().split())
    metrics = {
        "primary_length": len(primary),
        "shadow_count": len(shadows),
        "successful_shadows": len([s for s in shadows if "error" not in s]),
        "comparisons": [],
    }

    for shadow in shadows:
        if "error" in shadow:
            continue

        shadow_text = shadow.get("response_preview", "")
        if not shadow_text:
            continue

        shadow_words = set(shadow_text.lower().split())

        # Jaccard similarity (keyword overlap)
        intersection = primary_words & shadow_words
        union = primary_words | shadow_words
        overlap = len(intersection) / len(union) if union else 0

        metrics["comparisons"].append({
            "model": shadow["model"],
            "length_ratio": round(len(shadow_text) / len(primary), 2) if primary else 0,
            "keyword_overlap": round(overlap, 3),
            "latency_ratio": round(
                shadow.get("latency_ms", 0) / max(1, metrics.get("primary_latency_ms", 1)),
                2
            ) if shadow.get("latency_ms") else 0,
        })

    return metrics


# ─── Utility Functions ───────────────────────────────────────

async def get_shadow_stats(venue_id: str = None, days: int = 7) -> Dict:
    """Get shadow learning statistics."""
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    match_filter = {"created_at": {"$gte": since}}
    if venue_id:
        match_filter["venue_id"] = venue_id

    try:
        total = await db.ai_shadow_logs.count_documents(match_filter)

        # Aggregate quality scores
        pipeline = [
            {"$match": match_filter},
            {"$unwind": "$quality.comparisons"},
            {"$group": {
                "_id": "$quality.comparisons.model",
                "avg_keyword_overlap": {"$avg": "$quality.comparisons.keyword_overlap"},
                "avg_length_ratio": {"$avg": "$quality.comparisons.length_ratio"},
                "count": {"$sum": 1},
            }},
            {"$sort": {"avg_keyword_overlap": -1}},
        ]
        cursor = db.ai_shadow_logs.aggregate(pipeline)
        model_stats = await cursor.to_list(length=50)

        return {
            "period_days": days,
            "total_shadow_logs": total,
            "model_quality": [
                {
                    "model": s["_id"],
                    "avg_keyword_overlap": round(s["avg_keyword_overlap"], 3),
                    "avg_length_ratio": round(s["avg_length_ratio"], 2),
                    "sample_count": s["count"],
                }
                for s in model_stats
            ],
        }
    except Exception as e:
        logger.error("Shadow stats error: %s", e)
        return {"error": str(e)}
