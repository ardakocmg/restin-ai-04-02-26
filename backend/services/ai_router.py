"""
AI Router — Smart Task→Provider Routing with Fallback Chains
=============================================================
Routes AI requests to the best provider/model based on:
  1. Task type (text, image, tts, stt, embedding)
  2. Tenant config overrides
  3. Provider availability / rate limits
  4. Cost optimization

Falls back through a chain if the primary provider fails.
Tracks all usage for billing broker.
"""
import os
import logging
import time
from typing import Optional, Dict, List
from datetime import datetime, timezone

from services.ai_providers import (
    BaseAIProvider, AIResponse, EmbeddingResponse, TTSResponse, STTResponse, ImageResponse,
    get_provider, get_cost_estimate, PROVIDER_CLASSES,
)
from services.ai_config_resolver import resolve_config

logger = logging.getLogger(__name__)


# ─── Env Key Loader ─────────────────────────────────────────────
# Auto-loads API keys from .env as fallback when no DB keys are stored.
# This bridges the existing 5 Google keys to the new multi-provider router.

_env_keys_cache: Optional[Dict[str, str]] = None
_google_key_idx = 0  # Round-robin index for Google keys


def _load_env_keys() -> Dict[str, str]:
    """Load API keys from environment variables (fallback when no DB keys)."""
    global _env_keys_cache
    if _env_keys_cache is not None:
        return _env_keys_cache

    keys: Dict[str, str] = {}

    # Google: supports GOOGLE_API_KEYS (comma-separated for rotation)
    google_raw = os.getenv("GOOGLE_API_KEYS", "") or os.getenv("GOOGLE_API_KEY", "")
    google_keys = [k.strip() for k in google_raw.split(",") if k.strip() and len(k.strip()) > 10]
    if google_keys:
        keys["google"] = google_keys[0]  # Primary key
        keys["_google_all_keys"] = ",".join(google_keys)  # Store all for rotation

    # Other providers — single key each
    env_map = {
        "groq": "GROQ_API_KEY",
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "mistral": "MISTRAL_API_KEY",
        "elevenlabs": "ELEVENLABS_API_KEY",
        "deepgram": "DEEPGRAM_API_KEY",
        "cloudflare": "CLOUDFLARE_API_KEY",
        "huggingface": "HUGGINGFACE_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }
    for provider, env_var in env_map.items():
        val = os.getenv(env_var, "").strip()
        if val and len(val) > 5:
            keys[provider] = val

    found = [p for p in keys if not p.startswith("_")]
    if found:
        logger.info("ENV keys loaded for: %s", ", ".join(found))
    _env_keys_cache = keys
    return keys


def _get_google_key_rotated() -> str:
    """Get next Google key using round-robin (matches gemini_service.py)."""
    global _google_key_idx
    env_keys = _load_env_keys()
    all_keys_raw = env_keys.get("_google_all_keys", "")
    if not all_keys_raw:
        return env_keys.get("google", "")
    all_keys = all_keys_raw.split(",")
    key = all_keys[_google_key_idx % len(all_keys)]
    _google_key_idx += 1
    return key


# ─── Default Fallback Chains ────────────────────────────────────

DEFAULT_FALLBACK_CHAINS = {
    "text": [
        {"provider": "google", "model": "gemini-2.0-flash"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "openrouter", "model": "meta-llama/llama-3.3-70b-instruct:free"},
        {"provider": "mistral", "model": "mistral-small-latest"},
    ],
    "text_premium": [
        {"provider": "google", "model": "gemini-2.5-flash"},
        {"provider": "anthropic", "model": "claude-3-5-haiku-latest"},
        {"provider": "openai", "model": "gpt-4o-mini"},
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
    ],
    "text_reasoning": [
        {"provider": "google", "model": "gemini-2.5-pro"},
        {"provider": "anthropic", "model": "claude-3-5-sonnet-latest"},
        {"provider": "openai", "model": "gpt-4o"},
    ],
    "speed": [
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "groq", "model": "llama-3.1-8b-instant"},
        {"provider": "google", "model": "gemini-2.0-flash-lite"},
        {"provider": "cloudflare", "model": "@cf/meta/llama-3.1-8b-instruct"},
    ],
    "embedding": [
        {"provider": "google", "model": "text-embedding-004"},
        {"provider": "openai", "model": "text-embedding-3-small"},
        {"provider": "mistral", "model": "mistral-embed"},
    ],
    "image": [
        {"provider": "google", "model": "imagen-4-fast"},
        {"provider": "openai", "model": "dall-e-3"},
    ],
    "tts": [
        {"provider": "elevenlabs", "model": "eleven_turbo_v2_5"},
        {"provider": "google", "model": "gemini-2.5-flash-tts"},
    ],
    "stt": [
        {"provider": "deepgram", "model": "nova-2"},
        {"provider": "openai", "model": "whisper-1"},
    ],
    "sentiment": [
        {"provider": "huggingface", "model": "cardiffnlp/twitter-roberta-base-sentiment-latest"},
    ],
}

# Maps task types to fallback chain keys
TASK_TO_CHAIN = {
    "analysis": "text_premium",
    "strategy": "text_reasoning",
    "market": "text_premium",
    "content": "text",
    "studio": "text_premium",
    "chat": "text",
    "voice": "speed",
    "copilot": "text_premium",
    "image": "image",
    "tts": "tts",
    "stt": "stt",
    "embedding": "embedding",
    "sentiment": "sentiment",
    "default": "text",
}


# ─── In-Memory Rate Limiter ─────────────────────────────────────

class RateLimiter:
    """Simple in-memory rate limiter per provider."""

    def __init__(self):
        self._windows: Dict[str, List[float]] = {}

    def can_proceed(self, provider: str, rpm_limit: int = 30) -> bool:
        now = time.monotonic()
        key = provider
        if key not in self._windows:
            self._windows[key] = []

        # Clean old entries (older than 60s)
        self._windows[key] = [t for t in self._windows[key] if now - t < 60]

        if len(self._windows[key]) >= rpm_limit:
            return False

        self._windows[key].append(now)
        return True

    def record(self, provider: str):
        now = time.monotonic()
        if provider not in self._windows:
            self._windows[provider] = []
        self._windows[provider].append(now)


_rate_limiter = RateLimiter()


# ─── Provider Instance Cache ────────────────────────────────────

_provider_cache: Dict[str, BaseAIProvider] = {}


async def _get_provider_instance(
    provider_name: str,
    api_keys: Dict[str, str],
    extra_config: Dict = None,
) -> Optional[BaseAIProvider]:
    """Get or create a provider instance with the tenant's API key.
    
    Key resolution order:
      1. GeminiSDKProvider: auto-connects via gemini_service (5 keys from .env)
      2. Explicit api_keys dict (from DB or request)
      3. Environment variables (.env fallback)
    """
    # Special handling for Google — GeminiSDKProvider manages its own keys via gemini_service
    if provider_name == "google":
        cache_key = "google:sdk"
        if cache_key not in _provider_cache:
            from services.ai_providers import GeminiSDKProvider
            sdk_provider = GeminiSDKProvider()
            if sdk_provider.is_configured:
                _provider_cache[cache_key] = sdk_provider
                logger.info("Google provider: using SDK with %d-key rotation", 
                           len(sdk_provider._get_service()._clients))
            else:
                # Fall back to HTTP with env key
                api_key = api_keys.get("google", "") or _get_google_key_rotated()
                if api_key:
                    _provider_cache[cache_key] = get_provider("google_http", api_key)
                else:
                    return None
        return _provider_cache.get(cache_key)

    # All other providers — try explicit keys, then env fallback
    api_key = api_keys.get(provider_name, "")
    
    if not api_key:
        env_keys = _load_env_keys()
        api_key = env_keys.get(provider_name, "")
    
    if not api_key:
        return None

    cache_key = f"{provider_name}:{api_key[:8]}"
    if cache_key not in _provider_cache:
        kwargs = {}
        if provider_name == "cloudflare" and extra_config:
            kwargs["account_id"] = extra_config.get("cloudflare_account_id", "")
        elif provider_name == "cloudflare":
            kwargs["account_id"] = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
        _provider_cache[cache_key] = get_provider(provider_name, api_key, **kwargs)

    return _provider_cache[cache_key]


# ─── Core Router Functions ──────────────────────────────────────

async def route_completion(
    prompt: str,
    task_type: str = "default",
    system_prompt: str = "",
    temperature: float = 0.7,
    max_tokens: int = 1024,
    venue_id: str = "",
    group_id: str = "",
    api_keys: Optional[Dict[str, str]] = None,
    override_provider: str = "",
    override_model: str = "",
) -> AIResponse:
    """
    Route a text completion request through the fallback chain.
    Returns the first successful response.
    """
    # 0. Auto-inject system prompt rules
    from services.ai_system_prompts import build_system_prompt, GLOBAL_RULES
    if not system_prompt:
        # No custom prompt → build full prompt from centralized rules
        system_prompt = build_system_prompt(task_type=task_type)
    elif GLOBAL_RULES[:50] not in system_prompt:
        # Custom prompt provided → prepend global rules so base behavior is enforced
        system_prompt = f"{GLOBAL_RULES}\n\n{system_prompt}"

    # 1. Resolve tenant config
    config = await resolve_config(venue_id, group_id) if venue_id else {}
    routing = config.get("routing", {})
    keys = api_keys or config.get("provider_keys", {})

    # 2. Determine fallback chain
    if override_provider and override_model:
        chain = [{"provider": override_provider, "model": override_model}]
    elif task_type in routing:
        # Config has a specific model assigned — use it as primary
        model_id = routing[task_type]
        # Find provider from model registry
        chain_key = TASK_TO_CHAIN.get(task_type, "text")
        chain = DEFAULT_FALLBACK_CHAINS.get(chain_key, DEFAULT_FALLBACK_CHAINS["text"])
    else:
        chain_key = TASK_TO_CHAIN.get(task_type, "text")
        chain = DEFAULT_FALLBACK_CHAINS.get(chain_key, DEFAULT_FALLBACK_CHAINS["text"])

    # 3. Try each provider in the chain
    errors = []
    for step in chain:
        provider_name = step["provider"]
        model = step["model"]

        # Check rate limit
        if not _rate_limiter.can_proceed(provider_name):
            logger.warning("Rate limited: %s, skipping to next", provider_name)
            errors.append(f"{provider_name}: rate limited")
            continue

        # Get provider instance
        provider = await _get_provider_instance(provider_name, keys)
        if not provider:
            errors.append(f"{provider_name}: no API key")
            continue

        # Try completion
        logger.info("AI routing: task=%s → %s/%s", task_type, provider_name, model)
        response = await provider.complete(
            prompt=prompt,
            model=model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        if response.error:
            errors.append(f"{provider_name}/{model}: {response.error}")
            logger.warning("Provider failed: %s/%s — %s", provider_name, model, response.error)
            continue

        # Success — record usage
        _rate_limiter.record(provider_name)
        response.cost_usd = get_cost_estimate(provider_name, model, response.tokens_in, response.tokens_out)
        logger.info(
            "AI success: %s/%s — %d in, %d out, %.0fms, $%.6f",
            provider_name, model,
            response.tokens_in, response.tokens_out,
            response.latency_ms, response.cost_usd,
        )

        # 🔮 Shadow Learning: fan out to free models in background
        try:
            from services.ai_shadow import shadow_fanout
            asyncio.create_task(shadow_fanout(
                prompt=prompt,
                system_prompt=system_prompt,
                primary_response=response.text or "",
                primary_provider=provider_name,
                primary_model=model,
                primary_latency_ms=response.latency_ms,
                primary_tokens=response.tokens_in + response.tokens_out,
                task_type=task_type,
                venue_id=venue_id,
            ))
        except Exception as e:
            logger.debug("Shadow fanout skipped: %s", str(e)[:50])

        return response

    # All providers failed
    logger.error("All providers failed for task=%s: %s", task_type, "; ".join(errors))
    return AIResponse(
        error=f"All providers failed: {'; '.join(errors)}",
        provider="none",
        model="none",
    )


async def route_embedding(
    texts: List[str],
    venue_id: str = "",
    group_id: str = "",
    api_keys: Optional[Dict[str, str]] = None,
) -> EmbeddingResponse:
    """Route embedding request through fallback chain."""
    config = await resolve_config(venue_id, group_id) if venue_id else {}
    keys = api_keys or config.get("provider_keys", {})
    chain = DEFAULT_FALLBACK_CHAINS.get("embedding", [])

    for step in chain:
        provider = await _get_provider_instance(step["provider"], keys)
        if not provider:
            continue
        try:
            result = await provider.embed(texts, step["model"])
            if result.vectors:
                return result
        except NotImplementedError:
            continue
        except Exception as e:
            logger.warning("Embedding failed: %s — %s", step["provider"], str(e))

    return EmbeddingResponse()


async def route_tts(
    text: str,
    voice: str = "default",
    venue_id: str = "",
    group_id: str = "",
    api_keys: Optional[Dict[str, str]] = None,
) -> TTSResponse:
    """Route TTS request through fallback chain."""
    config = await resolve_config(venue_id, group_id) if venue_id else {}
    keys = api_keys or config.get("provider_keys", {})
    chain = DEFAULT_FALLBACK_CHAINS.get("tts", [])

    for step in chain:
        provider = await _get_provider_instance(step["provider"], keys)
        if not provider:
            continue
        try:
            result = await provider.synthesize(text, step["model"], voice)
            if result.audio_bytes:
                return result
        except NotImplementedError:
            continue
        except Exception as e:
            logger.warning("TTS failed: %s — %s", step["provider"], str(e))

    return TTSResponse()


async def route_stt(
    audio_bytes: bytes,
    venue_id: str = "",
    group_id: str = "",
    api_keys: Optional[Dict[str, str]] = None,
) -> STTResponse:
    """Route STT request through fallback chain."""
    config = await resolve_config(venue_id, group_id) if venue_id else {}
    keys = api_keys or config.get("provider_keys", {})
    chain = DEFAULT_FALLBACK_CHAINS.get("stt", [])

    for step in chain:
        provider = await _get_provider_instance(step["provider"], keys)
        if not provider:
            continue
        try:
            result = await provider.transcribe(audio_bytes, step["model"])
            if result.text:
                return result
        except NotImplementedError:
            continue
        except Exception as e:
            logger.warning("STT failed: %s — %s", step["provider"], str(e))

    return STTResponse()


async def route_image(
    prompt: str,
    venue_id: str = "",
    group_id: str = "",
    api_keys: Optional[Dict[str, str]] = None,
) -> ImageResponse:
    """Route image generation through fallback chain."""
    config = await resolve_config(venue_id, group_id) if venue_id else {}
    keys = api_keys or config.get("provider_keys", {})
    chain = DEFAULT_FALLBACK_CHAINS.get("image", [])

    for step in chain:
        provider = await _get_provider_instance(step["provider"], keys)
        if not provider:
            continue
        try:
            result = await provider.generate_image(prompt, step["model"])
            if result.url or result.base64:
                return result
        except NotImplementedError:
            continue
        except Exception as e:
            logger.warning("Image gen failed: %s — %s", step["provider"], str(e))

    return ImageResponse()


# ─── Utility ────────────────────────────────────────────────────

def get_available_chains() -> Dict[str, list]:
    """Return all available fallback chains for UI display."""
    return {
        chain_name: [
            {"provider": step["provider"], "model": step["model"]}
            for step in steps
        ]
        for chain_name, steps in DEFAULT_FALLBACK_CHAINS.items()
    }


def get_task_mapping() -> Dict[str, str]:
    """Return task→chain mapping for UI."""
    return TASK_TO_CHAIN.copy()
