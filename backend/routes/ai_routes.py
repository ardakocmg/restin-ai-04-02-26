"""
Restin AI Copilot Routes
========================
Endpoints for the AI Copilot chat interface.
Local-first intelligence with optional external AI escalation.
"""

from fastapi import APIRouter, Depends, Body, Query
from typing import Dict, Any
from core.database import get_database
from core.dependencies import get_current_user
from services.intelligence_engine import intelligence_engine
from services.gemini_service import gemini_service
from services.ai_models_registry import (
    AVAILABLE_MODELS, get_models_by_category, get_models_by_provider,
    get_free_models, get_all_providers, get_default_routing,
)
from services.ai_config_resolver import (
    get_config, save_config, resolve_config, get_all_configs, DEFAULT_SYSTEM_CONFIG
)
from datetime import datetime, timezone
from services.role_access import get_role_tier, can_use_external_ai, log_ai_audit, ai_rate_limiter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Copilot"])


@router.get("/gemini/status")
async def get_gemini_status():
    """Return Gemini AI configuration status for the integrations page."""
    return await gemini_service.get_status()


@router.get("/gemini/usage")
async def get_gemini_usage(
    venue_id: str = Query(None),
    days: int = Query(7, le=90),
):
    """Get AI usage stats: tokens, requests, cost breakdown per model/key."""
    return await gemini_service.get_usage_stats(venue_id=venue_id, days=days)


# ─── Shadow Learning Stats ──────────────────────────────────
@router.get("/shadow/stats")
async def get_shadow_stats(
    venue_id: str = Query(None),
    days: int = Query(7, le=90),
):
    """Get shadow learning quality metrics — how free models compare to primary."""
    from services.ai_shadow import get_shadow_stats
    return await get_shadow_stats(venue_id=venue_id, days=days)


@router.get("/shadow/recent")
async def get_shadow_recent(
    limit: int = Query(20, le=100),
):
    """Get recent shadow learning logs for review."""
    from core.database import db
    cursor = db.ai_shadow_logs.find(
        {}, {"prompt_preview": 1, "task_type": 1, "primary": 1,
             "shadows": 1, "quality": 1, "created_at": 1, "_id": 0}
    ).sort("created_at", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return {"logs": logs, "count": len(logs)}


# ─── Unified AI Dashboard ────────────────────────────────────
@router.get("/dashboard")
async def get_ai_dashboard(
    days: int = Query(7, le=90),
):
    """
    Unified AI Provider Dashboard — returns everything the UI needs:
    - All 10 providers with connection status (from .env)
    - Model count and task mapping per provider
    - Usage analytics (from ai_request_logs)
    - Shadow learning quality insights (from ai_shadow_logs)
    """
    from core.database import db
    from services.ai_router import (
        _load_env_keys, DEFAULT_FALLBACK_CHAINS, TASK_TO_CHAIN,
    )
    from services.ai_models_registry import (
        get_models_by_provider, get_all_providers,
    )
    from routes.ai_keys_routes import PROVIDER_INFO
    from datetime import timedelta

    # ── 1. Provider status ──────────────────────────────────────
    env_keys = _load_env_keys()
    connected_set = {p for p in env_keys if not p.startswith("_")}

    # Build provider-to-task mapping from fallback chains
    provider_tasks: dict = {}
    for chain_name, chain_models in DEFAULT_FALLBACK_CHAINS.items():
        for entry in chain_models:
            prov = entry["provider"]
            if prov not in provider_tasks:
                provider_tasks[prov] = {"chains": set(), "position": {}}
            provider_tasks[prov]["chains"].add(chain_name)
            # Track best (lowest) position in each chain
            pos = chain_models.index(entry) + 1
            if chain_name not in provider_tasks[prov]["position"] or pos < provider_tasks[prov]["position"][chain_name]:
                provider_tasks[prov]["position"][chain_name] = pos

    providers_list = []
    for provider_id in sorted(PROVIDER_INFO.keys()):
        info = PROVIDER_INFO[provider_id]
        models = get_models_by_provider(provider_id)
        free_count = sum(1 for m in models.values() if m.get("free"))
        tasks_info = provider_tasks.get(provider_id, {"chains": set(), "position": {}})

        # Count system keys (google can have multiple)
        key_count = 1 if provider_id in connected_set else 0
        if provider_id == "google" and "_google_all_keys" in env_keys:
            key_count = len(env_keys["_google_all_keys"].split(","))

        providers_list.append({
            "id": provider_id,
            "display_name": info["display_name"],
            "connected": provider_id in connected_set,
            "key_source": "system" if provider_id in connected_set else "none",
            "key_count": key_count,
            "capabilities": info.get("capabilities", []),
            "free_tier": info.get("free_tier", ""),
            "url": info.get("url", ""),
            "models_total": len(models),
            "models_free": free_count,
            "model_names": [
                {"id": mid, "name": m.get("name", mid), "tier": m.get("tier", ""), "category": m.get("category", "")}
                for mid, m in list(models.items())[:10]
            ],
            "used_in_chains": sorted(tasks_info["chains"]),
            "chain_positions": tasks_info["position"],
        })

    # ── 2. Usage analytics (last N days) ────────────────────────
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_iso = cutoff.isoformat()

    usage_by_provider: dict = {}
    usage_by_task: dict = {}
    total_requests = 0
    total_tokens = 0
    total_latency = 0.0

    try:
        cursor = db.ai_request_logs.find(
            {"created_at": {"$gte": cutoff_iso}},
            {"provider": 1, "task_type": 1, "tokens_used": 1, "latency_ms": 1, "_id": 0}
        ).limit(5000)
        async for doc in cursor:
            prov = doc.get("provider", "unknown")
            task = doc.get("task_type", "other")
            tokens = doc.get("tokens_used", 0)
            latency = doc.get("latency_ms", 0)

            usage_by_provider[prov] = usage_by_provider.get(prov, 0) + 1
            usage_by_task[task] = usage_by_task.get(task, 0) + 1
            total_requests += 1
            total_tokens += tokens
            total_latency += latency
    except Exception as e:
        logger.warning("Usage query skipped: %s", str(e)[:100])

    avg_latency = round(total_latency / total_requests, 1) if total_requests > 0 else 0

    # ── 3. Shadow learning insights ─────────────────────────────
    shadow_models: dict = {}
    shadow_total = 0

    try:
        cursor = db.ai_shadow_logs.find(
            {"created_at": {"$gte": cutoff_iso}},
            {"shadows": 1, "quality": 1, "_id": 0}
        ).limit(1000)
        async for doc in cursor:
            shadow_total += 1
            for shadow in doc.get("shadows", []):
                model = shadow.get("model", "unknown")
                if model not in shadow_models:
                    shadow_models[model] = {
                        "model": model,
                        "provider": shadow.get("provider", ""),
                        "samples": 0,
                        "errors": 0,
                        "total_latency": 0,
                        "total_tokens": 0,
                    }
                shadow_models[model]["samples"] += 1
                if "error" in shadow:
                    shadow_models[model]["errors"] += 1
                shadow_models[model]["total_latency"] += shadow.get("latency_ms", 0)
                shadow_models[model]["total_tokens"] += shadow.get("tokens_est", 0)

            # Quality metrics from the doc
            quality = doc.get("quality", {})
            overlap_scores = quality.get("keyword_overlap_scores", [])
            for i, score in enumerate(overlap_scores):
                shadows = doc.get("shadows", [])
                if i < len(shadows):
                    model = shadows[i].get("model", "unknown")
                    if model in shadow_models:
                        if "overlap_sum" not in shadow_models[model]:
                            shadow_models[model]["overlap_sum"] = 0
                            shadow_models[model]["overlap_count"] = 0
                        shadow_models[model]["overlap_sum"] += score
                        shadow_models[model]["overlap_count"] += 1
    except Exception as e:
        logger.warning("Shadow query skipped: %s", str(e)[:100])

    # Compute averages
    shadow_insights = []
    for model, data in shadow_models.items():
        avg_overlap = 0
        if data.get("overlap_count", 0) > 0:
            avg_overlap = round(data["overlap_sum"] / data["overlap_count"], 3)
        avg_lat = round(data["total_latency"] / max(data["samples"], 1), 1)
        shadow_insights.append({
            "model": model,
            "provider": data["provider"],
            "samples": data["samples"],
            "errors": data["errors"],
            "success_rate": round((data["samples"] - data["errors"]) / max(data["samples"], 1) * 100, 1),
            "avg_overlap": avg_overlap,
            "avg_latency_ms": avg_lat,
            "total_tokens": data["total_tokens"],
        })

    # Sort by overlap descending (best learners first)
    shadow_insights.sort(key=lambda x: x["avg_overlap"], reverse=True)

    # ── 4. Task mapping ─────────────────────────────────────────
    task_chains = {}
    for task, chain_key in TASK_TO_CHAIN.items():
        chain = DEFAULT_FALLBACK_CHAINS.get(chain_key, [])
        task_chains[task] = {
            "chain": chain_key,
            "providers": [e["provider"] for e in chain],
            "models": [e["model"] for e in chain],
        }

    return {
        "providers": providers_list,
        "usage": {
            "period_days": days,
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "avg_latency_ms": avg_latency,
            "by_provider": dict(sorted(usage_by_provider.items(), key=lambda x: x[1], reverse=True)),
            "by_task": dict(sorted(usage_by_task.items(), key=lambda x: x[1], reverse=True)),
        },
        "shadow_learning": {
            "total_logs": shadow_total,
            "model_insights": shadow_insights,
        },
        "task_mapping": task_chains,
        "summary": {
            "providers_connected": len(connected_set),
            "providers_total": len(PROVIDER_INFO),
            "models_total": len(AVAILABLE_MODELS),
            "models_free": sum(1 for m in AVAILABLE_MODELS.values() if m.get("free")),
        },
    }


@router.get("/models")
async def list_available_models(
    category: str = Query(None),
    provider: str = Query(None),
    free_only: bool = Query(False),
):
    """List available AI models. Supports filtering by category, provider, or free-only."""
    if free_only:
        models = get_free_models()
    elif provider:
        models = get_models_by_provider(provider)
    elif category:
        models = get_models_by_category(category)
    else:
        models = AVAILABLE_MODELS

    return {
        "models": [{**v, "id": k} for k, v in models.items()],
        "default_routing": get_default_routing(),
        "providers": get_all_providers(),
        "total": len(models),
    }


# ─── System Config (Super Admin) ─────────────────────────────
@router.get("/config/system")
async def get_system_config(current_user: dict = Depends(get_current_user)):
    """Get system-level AI config (super admin)."""
    cfg = await get_config("system", "")
    return cfg or DEFAULT_SYSTEM_CONFIG


@router.put("/config/system")
async def update_system_config(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Update system-level AI config. Super admin only."""
    role = current_user.get("role", "")
    if role not in ("product_owner", "super_admin", "admin"):
        return {"error": "Unauthorized. Super admin required."}

    return await save_config("system", "", payload, current_user.get("id", ""))


# ─── Group Config ────────────────────────────────────────────
@router.get("/config/group/{group_id}")
async def get_group_config(
    group_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get group/brand-level AI config."""
    cfg = await get_config("group", group_id)
    return cfg or {"level": "group", "level_id": group_id, "message": "No group config set. Using system defaults."}


@router.put("/config/group/{group_id}")
async def update_group_config(
    group_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Update group/brand-level AI config."""
    return await save_config("group", group_id, payload, current_user.get("id", ""))


# ─── Venue Config ────────────────────────────────────────────
@router.get("/config/venue/{venue_id}")
async def get_venue_config(
    venue_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get venue-level AI config."""
    cfg = await get_config("venue", venue_id)
    return cfg or {"level": "venue", "level_id": venue_id, "message": "No venue config set. Using group/system defaults."}


@router.put("/config/venue/{venue_id}")
async def update_venue_config(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Update venue-level AI config."""
    return await save_config("venue", venue_id, payload, current_user.get("id", ""))


# ─── Resolved Config (Cascade Merge) ─────────────────────────
@router.get("/config/resolved/{venue_id}")
async def get_resolved_config(
    venue_id: str,
    group_id: str = Query(""),
    current_user: dict = Depends(get_current_user),
):
    """Get final merged config for a venue (System → Group → Venue cascade)."""
    return await resolve_config(venue_id, group_id)


# ─── All Configs (Super Admin Overview) ──────────────────────
@router.get("/config/all")
async def list_all_configs(current_user: dict = Depends(get_current_user)):
    """List all AI configs across all levels (super admin)."""
    return await get_all_configs()


@router.post("/ask")
async def ask_ai(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Ask the AI Copilot a question.
    Uses local intelligence first (zero cost).
    Auto-escalates complex queries to Gemini when available.
    """
    query = payload.get("query", "").strip()
    session_id = payload.get("session_id")

    if not query:
        return {"response": "Lütfen bir soru sorun.", "intent": "empty", "cost": 0}

    # Rate limit check
    user_id = current_user.get("id", "")
    role_tier = get_role_tier(current_user)
    if not ai_rate_limiter.check(user_id, role_tier):
        remaining = ai_rate_limiter.get_remaining(user_id, role_tier)
        return {
            "response": (
                "⏳ **Rate Limit**\n\n"
                "Çok fazla sorgu gönderdiniz. Lütfen biraz bekleyin.\n"
                f"_Kalan hak: {remaining} / dakika_"
            ),
            "intent": "rate_limited", "cost": 0,
            "rate_limited": True,
        }

    result = await intelligence_engine.ask(
        venue_id=venue_id,
        query=query,
        user=current_user,
        session_id=session_id,
    )

    # Audit log (fire-and-forget)
    db = get_database()
    await log_ai_audit(
        db=db, venue_id=venue_id, user=current_user,
        query=query, intent=result.get("intent", "unknown"),
        role_tier=role_tier, access_granted=result.get("intent") != "access_denied",
        source=result.get("source", "local"),
        processing_ms=result.get("processing_ms", 0),
    )

    # Auto-escalate to Gemini if local engine returned generic help
    # and query seems complex enough to benefit from LLM reasoning
    if result["intent"] == "help" and len(query.split()) > 3 and gemini_service.configured:
        try:
            # Gather venue context for Gemini
            db = get_database()
            venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "name": 1, "currency": 1})
            venue_data = venue or {}

            gemini_result = await gemini_service.chat_with_data(
                query=query,
                venue_data=venue_data,
                venue_id=venue_id,
                model="flash",
            )

            if gemini_result.get("text") and not gemini_result["text"].startswith("["):
                result["response"] = gemini_result["text"]
                result["source"] = "gemini"
                result["model"] = gemini_result.get("model", "gemini-2.5-flash")
                result["tokens_used"] = gemini_result.get("tokens_used", 0)
                result["intent"] = "ai_analysis"
        except Exception as e:
            logger.warning("Gemini auto-escalation failed: %s", e)
            result["can_escalate"] = True
            result["escalation_hint"] = "Harici AI şu anda kullanılamıyor."
    elif result["intent"] == "help" and len(query.split()) > 3:
        result["can_escalate"] = True
        result["escalation_hint"] = "Bu soruyu daha detaylı analiz etmek için harici AI kullanılabilir."

    return result


@router.post("/ask/external")
async def ask_ai_external(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Escalate to external AI (Gemini/OpenAI).
    Requires venue-level approval. Costs tracked per request.
    """
    query = payload.get("query", "").strip()
    session_id = payload.get("session_id")

    if not query:
        return {"response": "Lütfen bir soru sorun.", "intent": "empty", "cost": 0}

    # Block staff from using external AI (cost control)
    role_tier = get_role_tier(current_user)
    if not can_use_external_ai(role_tier):
        return {
            "response": (
                "🔒 **Harici AI Erişimi Kısıtlı**\n\n"
                "Harici AI (Gemini/OpenAI) kullanımı maliyet oluşturduğu için "
                "yalnızca yönetici ve üzeri yetkiye sahip kullanıcılara açıktır.\n\n"
                "_Yerel AI ile sormaya devam edebilirsiniz._"
            ),
            "intent": "access_denied", "cost": 0,
            "access_denied": True, "role_tier": role_tier,
        }

    result = await intelligence_engine.ask_external(
        venue_id=venue_id,
        query=query,
        user=current_user,
        session_id=session_id,
    )
    return result


# ─── Action Execution (After Confirmation) ──────────────────
@router.post("/execute")
async def execute_ai_action(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a confirmed AI action.
    Called by the frontend after user confirms in the Hey Rin UI.
    """
    from services.ai_action_executor import execute_action, ACTION_METADATA

    action_type = payload.get("action_type", "")
    params = payload.get("params", {})

    if not action_type:
        return {"success": False, "message": "Missing action_type"}

    meta = ACTION_METADATA.get(action_type)
    if not meta:
        return {"success": False, "message": f"Unknown action: {action_type}"}

    # Rate limit check
    role_tier = get_role_tier(current_user)
    allowed = await ai_rate_limiter(current_user.get("id", ""), tier=role_tier)
    if not allowed:
        return {"success": False, "message": "⏱️ Rate limit aşıldı. Lütfen biraz bekleyin."}

    result = await execute_action(
        action_type=action_type,
        params=params,
        user=current_user,
        venue_id=venue_id,
    )

    return result


@router.get("/stats")
async def get_ai_stats(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get AI usage statistics for a venue."""
    return await intelligence_engine.get_stats(venue_id)


@router.get("/history")
async def get_ai_history(
    venue_id: str,
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get recent AI conversation history."""
    db = get_database()
    history = await db.ai_interactions.find(
        {"venue_id": venue_id},
        {"_id": 0, "id": 1, "query": 1, "intent": 1, "response": 1,
         "source": 1, "processing_ms": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return history


@router.get("/config")
async def get_ai_config(
    venue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get AI configuration for a venue."""
    db = get_database()
    config = await db.ai_configs.find_one({"venue_id": venue_id}, {"_id": 0})
    if not config:
        return {
            "venue_id": venue_id,
            "external_ai_enabled": False,
            "provider": "google",
            "model": "gemini-2.5-flash",
            "api_key": "",
        }
    # Mask API key for security
    if config.get("api_key"):
        key = config["api_key"]
        config["api_key_masked"] = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
        del config["api_key"]
    return config


@router.post("/config")
async def update_ai_config(
    venue_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Update AI configuration for a venue."""
    db = get_database()

    update_data = {
        "venue_id": venue_id,
        "external_ai_enabled": payload.get("external_ai_enabled", False),
        "provider": payload.get("provider", "google"),
        "model": payload.get("model", "gemini-2.5-flash"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.get("id"),
    }

    # Only update API key if provided
    if payload.get("api_key"):
        update_data["api_key"] = payload["api_key"]

    await db.ai_configs.update_one(
        {"venue_id": venue_id},
        {"$set": update_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    logger.info("AI config updated for venue %s by %s", venue_id, current_user.get("id"))
    return {"status": "updated"}


# ═══════════════════════════════════════════════════════════════
# UNIFIED AI EXECUTION ENDPOINTS (Multi-Provider Smart Routing)
# ═══════════════════════════════════════════════════════════════

@router.post("/complete")
async def ai_complete(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Smart text completion via multi-provider routing.
    Falls back through provider chain on failure.
    """
    from services.ai_router import route_completion

    prompt = payload.get("prompt", "").strip()
    if not prompt:
        return {"error": "Prompt is required", "text": ""}

    # Get tenant's API keys from DB
    venue_id = current_user.get("default_venue_id", "")
    db = get_database()
    key_docs = await db.ai_provider_keys.find(
        {"venue_id": venue_id},
        {"_id": 0, "provider": 1, "api_key": 1}
    ).to_list(20)
    api_keys = {doc["provider"]: doc["api_key"] for doc in key_docs}

    response = await route_completion(
        prompt=prompt,
        task_type=payload.get("task_type", "default"),
        system_prompt=payload.get("system_prompt", ""),
        temperature=payload.get("temperature", 0.7),
        max_tokens=payload.get("max_tokens", 1024),
        venue_id=venue_id,
        api_keys=api_keys,
        override_provider=payload.get("override_provider", ""),
        override_model=payload.get("override_model", ""),
    )

    # Track usage for billing
    if not response.error:
        await db.ai_usage_log.insert_one({
            "venue_id": venue_id,
            "user_id": current_user.get("id", ""),
            "provider": response.provider,
            "model": response.model,
            "task_type": payload.get("task_type", "default"),
            "tokens_in": response.tokens_in,
            "tokens_out": response.tokens_out,
            "latency_ms": response.latency_ms,
            "cost_usd": response.cost_usd,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "text": response.text,
        "provider": response.provider,
        "model": response.model,
        "tokens_in": response.tokens_in,
        "tokens_out": response.tokens_out,
        "latency_ms": response.latency_ms,
        "cost_usd": response.cost_usd,
        "error": response.error,
    }


@router.post("/embed")
async def ai_embed(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Generate embeddings via smart routing."""
    from services.ai_router import route_embedding

    texts = payload.get("texts", [])
    if not texts:
        return {"error": "texts array is required", "vectors": []}

    venue_id = current_user.get("default_venue_id", "")
    db = get_database()
    key_docs = await db.ai_provider_keys.find(
        {"venue_id": venue_id}, {"_id": 0, "provider": 1, "api_key": 1}
    ).to_list(20)
    api_keys = {doc["provider"]: doc["api_key"] for doc in key_docs}

    result = await route_embedding(texts=texts, venue_id=venue_id, api_keys=api_keys)
    return {
        "vectors": result.vectors,
        "provider": result.provider,
        "model": result.model,
        "dimensions": result.dimensions,
        "tokens_used": result.tokens_used,
    }


@router.post("/image")
async def ai_image(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Generate image via smart routing."""
    from services.ai_router import route_image

    prompt = payload.get("prompt", "").strip()
    if not prompt:
        return {"error": "prompt is required"}

    venue_id = current_user.get("default_venue_id", "")
    db = get_database()
    key_docs = await db.ai_provider_keys.find(
        {"venue_id": venue_id}, {"_id": 0, "provider": 1, "api_key": 1}
    ).to_list(20)
    api_keys = {doc["provider"]: doc["api_key"] for doc in key_docs}

    result = await route_image(prompt=prompt, venue_id=venue_id, api_keys=api_keys)

    # Track usage
    if result.url or result.base64:
        await db.ai_usage_log.insert_one({
            "venue_id": venue_id,
            "user_id": current_user.get("id", ""),
            "provider": result.provider,
            "model": result.model,
            "task_type": "image",
            "tokens_in": 0,
            "tokens_out": 0,
            "cost_usd": 0.04,  # Approx per image
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "url": result.url,
        "base64": result.base64,
        "provider": result.provider,
        "model": result.model,
        "revised_prompt": result.revised_prompt,
    }


@router.post("/tts")
async def ai_tts(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Text-to-speech via smart routing."""
    from services.ai_router import route_tts
    from fastapi.responses import Response

    text = payload.get("text", "").strip()
    if not text:
        return {"error": "text is required"}

    venue_id = current_user.get("default_venue_id", "")
    db = get_database()
    key_docs = await db.ai_provider_keys.find(
        {"venue_id": venue_id}, {"_id": 0, "provider": 1, "api_key": 1}
    ).to_list(20)
    api_keys = {doc["provider"]: doc["api_key"] for doc in key_docs}

    result = await route_tts(
        text=text,
        voice=payload.get("voice", "default"),
        venue_id=venue_id,
        api_keys=api_keys,
    )

    if result.audio_bytes:
        return Response(content=result.audio_bytes, media_type="audio/mpeg")
    return {"error": "TTS generation failed"}


@router.post("/stt")
async def ai_stt(
    current_user: dict = Depends(get_current_user),
):
    """Speech-to-text via smart routing."""
    from services.ai_router import route_stt
    from fastapi import File, UploadFile

    # Note: This endpoint requires multipart form upload
    # The actual file handling would be done by FastAPI's File dependency
    return {"error": "Use multipart/form-data with 'audio' field", "text": ""}
