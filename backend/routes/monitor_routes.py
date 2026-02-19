"""
System Monitor Routes — /api/system/monitor
Provides deployment health status + redeploy triggers for the agent and admin.
"""

from fastapi import APIRouter, Depends, HTTPException
from core.dependencies import get_current_user
import os
import sys
import logging

logger = logging.getLogger("monitor_routes")

router = APIRouter(prefix="/system/monitor", tags=["system-monitor"])

# ─── Lazy import deploy_monitor functions ──────────────────────────

def _get_monitor():
    """Lazy-load the deploy_monitor script."""
    scripts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    try:
        import deploy_monitor
        return deploy_monitor
    except ImportError as e:
        logger.error("Could not import deploy_monitor: %s", e)
        return None


@router.get("/status")
async def get_monitor_status(current_user: dict = Depends(get_current_user)):
    """
    Run health checks on production deployments and return status.
    Returns frontend, backend, and SSL health.
    """
    monitor = _get_monitor()
    if not monitor:
        return {
            "ok": False,
            "error": "Monitor module not available",
            "checks": [],
            "overall_status": "UNKNOWN"
        }

    config = monitor.load_config()

    # Check if production URLs are configured
    if not config["frontend_url"] and not config["backend_url"]:
        return {
            "ok": True,
            "overall_status": "NOT_CONFIGURED",
            "message": "No production URLs configured. Set PRODUCTION_FRONTEND_URL and PRODUCTION_BACKEND_URL in .env",
            "checks": []
        }

    results = monitor.run_health_check(config, verbose=False)
    results["ok"] = True
    return results


@router.get("/deployments")
async def get_deployments(current_user: dict = Depends(get_current_user)):
    """Get recent deployment history from Vercel and Render."""
    monitor = _get_monitor()
    if not monitor:
        return {"ok": False, "error": "Monitor module not available"}

    config = monitor.load_config()

    vercel_deploys = []
    render_deploys = []

    try:
        vercel_deploys = monitor.get_vercel_deployments(config, limit=5)
    except Exception as e:
        logger.error("Failed to fetch Vercel deployments: %s", e)

    try:
        render_deploys = monitor.get_render_deployments(config, limit=5)
    except Exception as e:
        logger.error("Failed to fetch Render deployments: %s", e)

    return {
        "ok": True,
        "vercel": {
            "configured": bool(config["vercel_token"] and config["vercel_project_id"]),
            "deployments": vercel_deploys
        },
        "render": {
            "configured": bool(config["render_api_key"] and config["render_service_id"]),
            "deployments": render_deploys
        }
    }


@router.post("/redeploy/{service}")
async def trigger_redeploy(service: str, current_user: dict = Depends(get_current_user)):
    """
    Trigger a redeploy for a specific service.
    Service must be 'vercel' or 'render'.
    Requires owner/admin role.
    """
    # Owner-only check
    role = current_user.get("role", "")
    if role not in ("product_owner", "owner", "admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Only owners/admins can trigger redeployments")

    if service not in ("vercel", "render"):
        raise HTTPException(status_code=400, detail="Service must be 'vercel' or 'render'")

    monitor = _get_monitor()
    if not monitor:
        return {"ok": False, "error": "Monitor module not available"}

    config = monitor.load_config()

    if service == "vercel":
        result = monitor.redeploy_vercel(config, dry_run=False)
    else:
        result = monitor.redeploy_render(config, dry_run=False)

    logger.info("Redeploy triggered by %s for %s: %s", current_user.get("id"), service, result)
    return {"ok": result.get("ok", False), "service": service, "result": result}


@router.get("/config")
async def get_monitor_config(current_user: dict = Depends(get_current_user)):
    """Check which monitoring features are configured (no secrets exposed)."""
    monitor = _get_monitor()
    if not monitor:
        return {"ok": False, "error": "Monitor module not available"}

    config = monitor.load_config()

    return {
        "ok": True,
        "configured": {
            "frontend_url": bool(config["frontend_url"]),
            "backend_url": bool(config["backend_url"]),
            "vercel_api": bool(config["vercel_token"] and config["vercel_project_id"]),
            "render_api": bool(config["render_api_key"] and config["render_service_id"]),
            "webhook": bool(config["webhook_url"]),
        },
        "settings": {
            "max_retries": config["max_retries"],
            "timeout_seconds": config["timeout_seconds"],
            "interval_seconds": config["interval_seconds"],
            "ssl_warn_days": config["ssl_warn_days"],
        }
    }
