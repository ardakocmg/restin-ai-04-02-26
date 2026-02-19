"""
Gemini Service — Smart Router + Key Rotation (Pillar 1)
=======================================================
Multi-key rotation across Google projects for doubled capacity.
Auto-fallback: if one key/model hits 429, rotates to next key.

Env: GOOGLE_API_KEYS=key1,key2,key3  (comma-separated, different projects)
"""
import os
import logging
import asyncio
from datetime import datetime, timezone
from core.database import db

logger = logging.getLogger(__name__)

GENAI_AVAILABLE = False
try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    logger.warning("No google-genai SDK. Run: pip install google-genai")

# ─── Model Router ─────────────────────────────────────────────
MODEL_ROUTER = {
    "analysis": "gemini-2.5-flash",
    "strategy": "gemini-2.5-flash",
    "market":   "gemini-2.5-flash",
    "content":  "gemini-2.5-flash",
    "studio":   "gemini-2.5-flash",
    "chat":     "gemini-2.0-flash",
    "voice":    "gemini-2.0-flash",
    "copilot":  "gemini-2.0-flash",
    "default":  "gemini-2.5-flash",
}

MODEL_FALLBACK = {
    "gemini-2.5-flash": "gemini-2.0-flash",
    "gemini-2.0-flash": "gemini-2.5-flash",
}


class GeminiService:
    def __init__(self):
        self.configured = False
        self._clients = []           # list of (key_label, genai.Client)
        self._current_idx = 0        # current key index

        # Parse keys from env (supports both GOOGLE_API_KEYS and GOOGLE_API_KEY)
        raw = os.getenv("GOOGLE_API_KEYS", "") or os.getenv("GOOGLE_API_KEY", "")
        self._keys = [k.strip() for k in raw.split(",") if k.strip() and len(k.strip()) > 10]

        if not self._keys:
            logger.warning("⚠️ No API keys found. Set GOOGLE_API_KEYS in .env")
            return
        if not GENAI_AVAILABLE:
            return

        # Create a client per key
        for i, key in enumerate(self._keys):
            try:
                client = genai.Client(api_key=key)
                label = f"key-{i+1}...{key[-4:]}"
                self._clients.append((label, client))
            except Exception as e:
                logger.error("Failed to init key %d: %s", i, e)

        if self._clients:
            self.configured = True
            labels = [c[0] for c in self._clients]
            logger.info("✅ Gemini AI ready — %d keys: [%s]", len(self._clients), ", ".join(labels))
        else:
            logger.warning("⚠️ No valid Gemini clients created")

    def _get_client(self):
        """Get current client tuple (label, client)."""
        if not self._clients:
            return None, None
        return self._clients[self._current_idx]

    def _rotate_key(self):
        """Move to next key (round-robin)."""
        if len(self._clients) <= 1:
            return False
        old_idx = self._current_idx
        self._current_idx = (self._current_idx + 1) % len(self._clients)
        old_label = self._clients[old_idx][0]
        new_label = self._clients[self._current_idx][0]
        logger.info("🔄 Key rotated: %s → %s", old_label, new_label)
        return True

    # ─── Core Call ────────────────────────────────────────────
    async def _call(self, prompt: str, max_tokens: int = 1024,
                    temperature: float = 0.7, task_type: str = "default") -> tuple:
        """Returns (text, model_used, key_label).
        Uses proactive round-robin: each request goes to the next key
        to spread quota evenly across all projects.
        """
        model = MODEL_ROUTER.get(task_type, MODEL_ROUTER["default"])
        fallback_model = MODEL_FALLBACK.get(model)

        from google.genai import types
        cfg = types.GenerateContentConfig(
            max_output_tokens=max_tokens, temperature=temperature
        )

        # Proactive round-robin: rotate to next key BEFORE calling
        self._rotate_key()

        # Try all keys × 2 models before giving up
        attempts = len(self._clients) * 2
        last_error = None

        for attempt in range(attempts):
            key_label, client = self._get_client()
            current_model = model if attempt % 2 == 0 else (fallback_model or model)

            try:
                cm = current_model
                response = await asyncio.to_thread(
                    lambda: client.models.generate_content(
                        model=cm, contents=prompt, config=cfg
                    )
                )
                return (response.text or "", cm, key_label)

            except Exception as e:
                error_str = str(e)
                last_error = e

                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning("⚡ %s/%s quota hit (attempt %d/%d)",
                                   key_label, current_model, attempt + 1, attempts)
                    # Even attempt: try fallback model (same key)
                    # Odd attempt: rotate to next key
                    if attempt % 2 == 1:
                        self._rotate_key()
                else:
                    logger.error("Gemini error (%s/%s): %s", key_label, current_model, error_str[:80])
                    raise e

        raise last_error or Exception("All keys exhausted")

    # ─── Public Methods ───────────────────────────────────────
    async def chat(self, prompt: str, system_instruction: str = "",
                   venue_id: str = "", model: str = "flash",
                   max_tokens: int = 1024, task_type: str = "chat") -> dict:
        if not self.configured:
            return {"text": "[Gemini not configured]", "tokens_used": 0, "model": "none"}
        try:
            full = f"{system_instruction}\n\n---\n\n{prompt}" if system_instruction else prompt
            start = __import__('time').monotonic()
            text, model_used, key_label = await self._call(full, max_tokens, task_type=task_type)
            latency_ms = (__import__('time').monotonic() - start) * 1000
            tokens_est = (len(full) + len(text)) // 4
            await self._log_usage(venue_id, task_type, tokens_est, model_used, key_label)

            # 🔮 Shadow Learning: fan out to free models in background
            try:
                import asyncio
                from services.ai_shadow import shadow_fanout
                asyncio.create_task(shadow_fanout(
                    prompt=prompt,
                    system_prompt=system_instruction,
                    primary_response=text,
                    primary_provider="google",
                    primary_model=model_used,
                    primary_latency_ms=latency_ms,
                    primary_tokens=tokens_est,
                    task_type=task_type,
                    venue_id=venue_id,
                ))
            except Exception:
                pass  # Shadow is best-effort

            return {"text": text, "tokens_used": tokens_est, "model": model_used, "key": key_label}
        except Exception as e:
            logger.error("Gemini error: %s", e)
            return {"text": f"[AI Error: {str(e)[:100]}]", "tokens_used": 0, "model": "error"}

    async def chat_with_data(self, query: str, venue_data: dict,
                             venue_id: str = "", model: str = "flash") -> dict:
        import json
        data = json.dumps(venue_data, default=str, ensure_ascii=False)
        if len(data) > 4000:
            data = data[:4000] + "...[truncated]"
        from services.ai_system_prompts import copilot_prompt
        return await self.chat(
            prompt=f"**Venue Data:**\n```json\n{data}\n```\n\n**Question:** {query}",
            system_instruction=copilot_prompt(),
            venue_id=venue_id, max_tokens=2048, task_type="analysis",
        )

    async def generate_content(self, content_type: str, context: dict,
                               venue_id: str = "") -> dict:
        prompts = {
            "caption": f"Write a short Instagram caption for: {context.get('dish_name', 'our special')}. 2-3 emojis, 3 hashtags.",
            "description": f"Menu description (2-3 sentences) for: {context.get('dish_name', 'our special')}. Ingredients: {context.get('ingredients', 'seasonal')}.",
            "seo_meta": f"SEO meta (max 160 chars) for: {context.get('topic', 'fine dining')}.",
            "social_post": f"Social media post announcing: {context.get('announcement', 'our new menu')}. Exciting and engaging.",
        }
        from services.ai_system_prompts import content_prompt
        return await self.chat(
            prompt=prompts.get(content_type, f"Generate content: {context}"),
            system_instruction=content_prompt(),
            venue_id=venue_id, max_tokens=512, task_type="content",
        )

    async def analyze_market(self, venue_data: dict, city: str,
                             cuisine: str, venue_id: str = "") -> dict:
        from services.ai_system_prompts import market_prompt
        return await self.chat(
            prompt=(
                f"Competitive landscape for a {cuisine} restaurant in {city}.\n"
                f"Our data:\n{venue_data}\n\n"
                "Provide: 1) Pricing position 2) Demand trends "
                "3) Revenue opportunities 4) Pricing adjustments"
            ),
            system_instruction=market_prompt(city=city, cuisine=cuisine),
            venue_id=venue_id, max_tokens=1024, task_type="market",
        )

    async def voice_response(self, caller_query: str, knowledge_base: str,
                             menu_context: str, venue_id: str = "") -> dict:
        from services.ai_system_prompts import voice_prompt
        return await self.chat(
            prompt=(
                f"**Knowledge Base:**\n{knowledge_base}\n\n"
                f"**Menu:**\n{menu_context}\n\n"
                f"**Customer says:** \"{caller_query}\"\n\nRespond as receptionist:"
            ),
            system_instruction=voice_prompt(knowledge_base=knowledge_base),
            venue_id=venue_id, max_tokens=256, task_type="voice",
        )

    async def get_status(self) -> dict:
        return {
            "provider": "google_gemini",
            "configured": self.configured,
            "total_keys": len(self._clients),
            "active_key": self._clients[self._current_idx][0] if self._clients else None,
            "keys": [c[0] for c in self._clients],
            "sdk": "google-genai",
            "models": list(set(MODEL_ROUTER.values())) if self.configured else [],
            "routing": MODEL_ROUTER if self.configured else {},
            "status": "connected" if self.configured else "disconnected",
        }

    async def get_usage_stats(self, venue_id: str = None, days: int = 7) -> dict:
        """Aggregate AI usage stats from ai_usage_logs."""
        from datetime import timedelta
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        match_filter = {"created_at": {"$gte": since}}
        if venue_id:
            match_filter["venue_id"] = venue_id

        try:
            pipeline = [
                {"$match": match_filter},
                {"$group": {
                    "_id": {"model": "$model", "key": "$api_key", "action": "$action"},
                    "total_tokens": {"$sum": "$tokens_used"},
                    "total_requests": {"$sum": 1},
                    "total_cost": {"$sum": "$estimated_cost_usd"},
                }},
                {"$sort": {"total_tokens": -1}},
            ]
            cursor = db.ai_usage_logs.aggregate(pipeline)
            results = await cursor.to_list(length=100)

            # Summarize
            total_tokens = sum(r["total_tokens"] for r in results)
            total_requests = sum(r["total_requests"] for r in results)
            total_cost = sum(r["total_cost"] for r in results)

            breakdown = []
            for r in results:
                breakdown.append({
                    "model": r["_id"].get("model", "unknown"),
                    "key": r["_id"].get("key", "unknown"),
                    "action": r["_id"].get("action", "unknown"),
                    "tokens": r["total_tokens"],
                    "requests": r["total_requests"],
                    "cost_usd": round(r["total_cost"], 6),
                })

            return {
                "period_days": days,
                "total_tokens": total_tokens,
                "total_requests": total_requests,
                "total_cost_usd": round(total_cost, 6),
                "breakdown": breakdown,
            }
        except Exception as e:
            logger.error("Usage stats error: %s", e)
            return {"error": str(e), "total_tokens": 0, "total_requests": 0}

    async def _log_usage(self, venue_id: str, action: str, tokens: int,
                         model: str, key_label: str = ""):
        if not venue_id:
            return
        try:
            cost = {"gemini-2.5-flash": 0.00000015, "gemini-2.0-flash": 0.0000001}
            await db.ai_usage_logs.insert_one({
                "venue_id": venue_id,
                "provider": "google_gemini",
                "model": model,
                "api_key": key_label,
                "action": action,
                "tokens_used": tokens,
                "estimated_cost_usd": tokens * cost.get(model, 0.0000001),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error("AI usage log failed: %s", e)


gemini_service = GeminiService()
