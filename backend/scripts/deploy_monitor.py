"""
═══════════════════════════════════════════════════════════════════
🛡️ RESTIN.AI — Deployment Monitor
═══════════════════════════════════════════════════════════════════
Monitors Vercel (frontend) and Render (backend) deployments.
Supports passive health checks + active auto-redeploy.

Usage:
  python deploy_monitor.py              # Quick health check
  python deploy_monitor.py --verbose    # Detailed output
  python deploy_monitor.py --check-and-fix  # Auto-redeploy on failure
  python deploy_monitor.py --dry-run    # Test without real API calls
  python deploy_monitor.py --continuous # Run every 5 min
═══════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import time
import ssl
import socket
import argparse
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add backend to path for .env loading
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# ─── Configuration ─────────────────────────────────────────────────

def load_config():
    """Load config from environment / .env file."""
    env_path = BACKEND_DIR / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

    return {
        "frontend_url": os.environ.get("PRODUCTION_FRONTEND_URL", ""),
        "backend_url": os.environ.get("PRODUCTION_BACKEND_URL", ""),
        "vercel_token": os.environ.get("VERCEL_TOKEN", ""),
        "vercel_project_id": os.environ.get("VERCEL_PROJECT_ID", ""),
        "vercel_team_id": os.environ.get("VERCEL_TEAM_ID", ""),
        "render_api_key": os.environ.get("RENDER_API_KEY", ""),
        "render_service_id": os.environ.get("RENDER_SERVICE_ID", ""),
        "webhook_url": os.environ.get("MONITOR_WEBHOOK_URL", ""),
        "max_retries": int(os.environ.get("MONITOR_MAX_RETRIES", "3")),
        "timeout_seconds": int(os.environ.get("MONITOR_TIMEOUT", "10")),
        "interval_seconds": int(os.environ.get("MONITOR_INTERVAL", "300")),
        "ssl_warn_days": int(os.environ.get("MONITOR_SSL_WARN_DAYS", "14")),
    }

# ─── Windows Encoding Fix ──────────────────────────────────────────
# Windows cp1254 (Turkish) console chokes on emoji/unicode.
# Force UTF-8 stdout/stderr to prevent UnicodeEncodeError.
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ─── Logger ────────────────────────────────────────────────────────

LOG_DIR = BACKEND_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "deploy_monitor.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger("deploy_monitor")


# ─── HTTP Helper ───────────────────────────────────────────────────

def http_get(url: str, headers: dict = None, timeout: int = 10) -> dict:
    """HTTP GET with fallback between httpx and requests."""
    start = time.time()
    try:
        if HAS_HTTPX:
            with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                resp = client.get(url, headers=headers or {})
                elapsed = (time.time() - start) * 1000
                return {
                    "status_code": resp.status_code,
                    "body": resp.text[:500],
                    "latency_ms": round(elapsed, 1),
                    "ok": 200 <= resp.status_code < 400,
                    "error": None,
                }
        elif HAS_REQUESTS:
            resp = requests.get(url, headers=headers or {}, timeout=timeout, allow_redirects=True)
            elapsed = (time.time() - start) * 1000
            return {
                "status_code": resp.status_code,
                "body": resp.text[:500],
                "latency_ms": round(elapsed, 1),
                "ok": 200 <= resp.status_code < 400,
                "error": None,
            }
        else:
            # Fallback: urllib
            import urllib.request
            req = urllib.request.Request(url, headers=headers or {})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                elapsed = (time.time() - start) * 1000
                body = resp.read(500).decode("utf-8", errors="replace")
                return {
                    "status_code": resp.status,
                    "body": body,
                    "latency_ms": round(elapsed, 1),
                    "ok": 200 <= resp.status < 400,
                    "error": None,
                }
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return {
            "status_code": 0,
            "body": "",
            "latency_ms": round(elapsed, 1),
            "ok": False,
            "error": str(e),
        }


def http_post(url: str, headers: dict = None, json_data: dict = None, timeout: int = 10) -> dict:
    """HTTP POST with fallback."""
    try:
        if HAS_HTTPX:
            with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                resp = client.post(url, headers=headers or {}, json=json_data)
                return {"status_code": resp.status_code, "body": resp.text[:500], "ok": 200 <= resp.status_code < 400, "error": None}
        elif HAS_REQUESTS:
            resp = requests.post(url, headers=headers or {}, json=json_data, timeout=timeout)
            return {"status_code": resp.status_code, "body": resp.text[:500], "ok": 200 <= resp.status_code < 400, "error": None}
        else:
            return {"status_code": 0, "body": "", "ok": False, "error": "No HTTP library available (install httpx or requests)"}
    except Exception as e:
        return {"status_code": 0, "body": "", "ok": False, "error": str(e)}


# ─── Health Checks ─────────────────────────────────────────────────

def check_frontend(config: dict, verbose: bool = False) -> dict:
    """Check frontend (Vercel) health."""
    url = config["frontend_url"]
    if not url:
        return {"service": "frontend", "status": "SKIP", "message": "PRODUCTION_FRONTEND_URL not configured"}

    result = http_get(url, timeout=config["timeout_seconds"])

    if not result["ok"]:
        return {
            "service": "frontend",
            "status": "DOWN",
            "url": url,
            "error": result["error"] or f"HTTP {result['status_code']}",
            "latency_ms": result["latency_ms"],
        }

    # Verify it's actually our app
    body_lower = result["body"].lower()
    is_restin = "restin" in body_lower or "restaurant" in body_lower

    status = "UP" if is_restin else "DEGRADED"
    msg = "Frontend responding correctly" if is_restin else "Frontend responding but content may not be Restin.ai"

    return {
        "service": "frontend",
        "status": status,
        "url": url,
        "latency_ms": result["latency_ms"],
        "message": msg,
        "status_code": result["status_code"],
    }


def check_backend(config: dict, verbose: bool = False) -> dict:
    """Check backend (Render) health via /api/health endpoint."""
    url = config["backend_url"]
    if not url:
        return {"service": "backend", "status": "SKIP", "message": "PRODUCTION_BACKEND_URL not configured"}

    health_url = f"{url.rstrip('/')}/api/health"
    result = http_get(health_url, timeout=config["timeout_seconds"])

    if not result["ok"]:
        return {
            "service": "backend",
            "status": "DOWN",
            "url": health_url,
            "error": result["error"] or f"HTTP {result['status_code']}",
            "latency_ms": result["latency_ms"],
        }

    # Check if response is valid JSON with expected fields
    try:
        data = json.loads(result["body"])
        is_healthy = data.get("status") in ("ok", "healthy", True) or result["status_code"] == 200
    except (json.JSONDecodeError, KeyError):
        is_healthy = result["status_code"] == 200

    slow = result["latency_ms"] > 3000

    if is_healthy and not slow:
        status = "UP"
        msg = f"Backend healthy ({result['latency_ms']:.0f}ms)"
    elif is_healthy and slow:
        status = "SLOW"
        msg = f"Backend responding but slow ({result['latency_ms']:.0f}ms > 3000ms)"
    else:
        status = "DEGRADED"
        msg = "Backend responding but health check content unexpected"

    return {
        "service": "backend",
        "status": status,
        "url": health_url,
        "latency_ms": result["latency_ms"],
        "message": msg,
        "status_code": result["status_code"],
    }


def check_ssl(config: dict) -> dict:
    """Check SSL certificate expiry for the frontend domain."""
    url = config["frontend_url"]
    if not url or not url.startswith("https"):
        return {"service": "ssl", "status": "SKIP", "message": "No HTTPS URL configured"}

    try:
        from urllib.parse import urlparse
        hostname = urlparse(url).hostname
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                expires = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                days_left = (expires - datetime.now(timezone.utc)).days

                if days_left < 0:
                    return {"service": "ssl", "status": "CRITICAL", "message": f"SSL EXPIRED {abs(days_left)} days ago!", "expires": expires.isoformat(), "days_left": days_left}
                elif days_left < config["ssl_warn_days"]:
                    return {"service": "ssl", "status": "WARNING", "message": f"SSL expires in {days_left} days", "expires": expires.isoformat(), "days_left": days_left}
                else:
                    return {"service": "ssl", "status": "OK", "message": f"SSL valid for {days_left} days", "expires": expires.isoformat(), "days_left": days_left}
    except Exception as e:
        return {"service": "ssl", "status": "ERROR", "message": f"SSL check failed: {e}"}


# ─── Vercel API ────────────────────────────────────────────────────

def get_vercel_deployments(config: dict, limit: int = 5) -> list:
    """Fetch recent Vercel deployments."""
    token = config["vercel_token"]
    project_id = config["vercel_project_id"]
    if not token or not project_id:
        return []

    url = f"https://api.vercel.com/v6/deployments?projectId={project_id}&limit={limit}"
    if config.get("vercel_team_id"):
        url += f"&teamId={config['vercel_team_id']}"

    result = http_get(url, headers={"Authorization": f"Bearer {token}"})
    if result["ok"]:
        try:
            return json.loads(result["body"]).get("deployments", [])
        except (json.JSONDecodeError, KeyError):
            return []
    return []


def redeploy_vercel(config: dict, dry_run: bool = False) -> dict:
    """Trigger a new Vercel deployment from the latest commit."""
    token = config["vercel_token"]
    project_id = config["vercel_project_id"]
    if not token or not project_id:
        return {"ok": False, "error": "VERCEL_TOKEN or VERCEL_PROJECT_ID not configured"}

    if dry_run:
        logger.info("[DRY-RUN] Would trigger Vercel redeploy for project %s", project_id)
        return {"ok": True, "dry_run": True}

    url = "https://api.vercel.com/v13/deployments"
    if config.get("vercel_team_id"):
        url += f"?teamId={config['vercel_team_id']}"

    payload = {"name": project_id, "project": project_id}
    result = http_post(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json_data=payload)

    if result["ok"]:
        logger.info("✅ Vercel redeploy triggered successfully")
        return {"ok": True, "response": result["body"]}
    else:
        logger.error("❌ Vercel redeploy failed: %s", result["error"] or result["body"])
        return {"ok": False, "error": result["error"] or result["body"]}


# ─── Render API ────────────────────────────────────────────────────

def get_render_deployments(config: dict, limit: int = 5) -> list:
    """Fetch recent Render deploys."""
    api_key = config["render_api_key"]
    service_id = config["render_service_id"]
    if not api_key or not service_id:
        return []

    url = f"https://api.render.com/v1/services/{service_id}/deploys?limit={limit}"
    result = http_get(url, headers={"Authorization": f"Bearer {api_key}"})
    if result["ok"]:
        try:
            return json.loads(result["body"])
        except (json.JSONDecodeError, KeyError):
            return []
    return []


def redeploy_render(config: dict, dry_run: bool = False) -> dict:
    """Trigger a new Render deploy."""
    api_key = config["render_api_key"]
    service_id = config["render_service_id"]
    if not api_key or not service_id:
        return {"ok": False, "error": "RENDER_API_KEY or RENDER_SERVICE_ID not configured"}

    if dry_run:
        logger.info("[DRY-RUN] Would trigger Render redeploy for service %s", service_id)
        return {"ok": True, "dry_run": True}

    url = f"https://api.render.com/v1/services/{service_id}/deploys"
    result = http_post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json_data={})

    if result["ok"]:
        logger.info("✅ Render redeploy triggered successfully")
        return {"ok": True, "response": result["body"]}
    else:
        logger.error("❌ Render redeploy failed: %s", result["error"] or result["body"])
        return {"ok": False, "error": result["error"] or result["body"]}


# ─── Webhook Notification ──────────────────────────────────────────

def send_notification(config: dict, message: str, level: str = "info"):
    """Send notification via webhook (Discord/Slack compatible)."""
    webhook_url = config.get("webhook_url")
    if not webhook_url:
        return

    emoji = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨", "recovery": "✅"}.get(level, "📋")

    # Discord format (works with Slack too)
    payload = {
        "content": f"{emoji} **Restin.AI Monitor** — {message}",
        "embeds": [{
            "title": f"Deployment Monitor Alert",
            "description": message,
            "color": {"info": 3447003, "warning": 16776960, "critical": 15158332, "recovery": 3066993}.get(level, 3447003),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }]
    }

    try:
        http_post(webhook_url, headers={"Content-Type": "application/json"}, json_data=payload, timeout=5)
    except Exception as e:
        logger.error("Failed to send webhook notification: %s", e)


# ─── Main Monitor Logic ───────────────────────────────────────────

def run_health_check(config: dict, verbose: bool = False) -> dict:
    """Run all health checks and return structured results."""
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": [],
        "overall_status": "UP",
    }

    # Frontend
    frontend = check_frontend(config, verbose)
    results["checks"].append(frontend)
    if verbose:
        logger.info("Frontend: %s — %s", frontend["status"], frontend.get("message", frontend.get("error", "")))

    # Backend
    backend = check_backend(config, verbose)
    results["checks"].append(backend)
    if verbose:
        logger.info("Backend: %s — %s", backend["status"], backend.get("message", backend.get("error", "")))

    # SSL
    ssl_check = check_ssl(config)
    results["checks"].append(ssl_check)
    if verbose:
        logger.info("SSL: %s — %s", ssl_check["status"], ssl_check.get("message", ""))

    # Determine overall status
    statuses = [c["status"] for c in results["checks"]]
    if "DOWN" in statuses or "CRITICAL" in statuses:
        results["overall_status"] = "DOWN"
    elif "DEGRADED" in statuses or "SLOW" in statuses or "WARNING" in statuses:
        results["overall_status"] = "DEGRADED"
    elif all(s in ("UP", "OK", "SKIP") for s in statuses):
        results["overall_status"] = "UP"

    return results


def check_and_fix(config: dict, dry_run: bool = False, verbose: bool = False) -> dict:
    """Run health checks and auto-redeploy if services are down."""
    results = run_health_check(config, verbose)

    if results["overall_status"] == "UP":
        logger.info("✅ All services healthy — no action needed")
        return results

    # Determine which services need redeploy
    actions_taken = []

    for check in results["checks"]:
        if check["status"] == "DOWN":
            service = check["service"]
            logger.warning("🚨 %s is DOWN — attempting recovery...", service.upper())

            if service == "frontend":
                send_notification(config, f"Frontend is DOWN — triggering redeploy", "critical")
                result = redeploy_vercel(config, dry_run)
                actions_taken.append({"service": "frontend", "action": "redeploy_vercel", "result": result})

            elif service == "backend":
                send_notification(config, f"Backend is DOWN — triggering redeploy", "critical")
                result = redeploy_render(config, dry_run)
                actions_taken.append({"service": "backend", "action": "redeploy_render", "result": result})

        elif check["status"] == "SLOW":
            logger.warning("⚡ %s is SLOW (%sms) — monitoring...", check["service"].upper(), check.get("latency_ms", "?"))
            send_notification(config, f"{check['service']} is SLOW ({check.get('latency_ms', '?')}ms)", "warning")

    results["actions_taken"] = actions_taken
    return results


def run_continuous(config: dict, verbose: bool = False, dry_run: bool = False):
    """Continuously monitor at configured interval."""
    interval = config["interval_seconds"]
    failure_counts = {"frontend": 0, "backend": 0}
    max_retries = config["max_retries"]

    logger.info("🔄 Starting continuous monitoring (every %ds, redeploy after %d failures)", interval, max_retries)

    while True:
        try:
            results = run_health_check(config, verbose)

            for check in results["checks"]:
                service = check["service"]
                if service not in failure_counts:
                    continue

                if check["status"] == "DOWN":
                    failure_counts[service] += 1
                    logger.warning("⚠️ %s DOWN (failure %d/%d)", service, failure_counts[service], max_retries)

                    if failure_counts[service] >= max_retries:
                        logger.error("🚨 %s DOWN %d times — triggering redeploy!", service, max_retries)
                        if service == "frontend":
                            redeploy_vercel(config, dry_run)
                        elif service == "backend":
                            redeploy_render(config, dry_run)
                        send_notification(config, f"{service} was DOWN {max_retries} times in a row — auto-redeploy triggered", "critical")
                        failure_counts[service] = 0  # Reset after redeploy
                else:
                    if failure_counts[service] > 0:
                        logger.info("✅ %s recovered after %d failures", service, failure_counts[service])
                        send_notification(config, f"{service} recovered after {failure_counts[service]} failures", "recovery")
                    failure_counts[service] = 0

            # Summary log
            status_line = " | ".join(f"{c['service']}={c['status']}" for c in results["checks"] if c["status"] != "SKIP")
            logger.info("📊 %s | Overall: %s", status_line, results["overall_status"])

        except Exception as e:
            logger.error("Monitor loop error: %s", e)

        time.sleep(interval)


# ─── CLI ───────────────────────────────────────────────────────────

def print_report(results: dict):
    """Pretty-print health check results."""
    icons = {"UP": "✅", "DOWN": "❌", "DEGRADED": "⚠️", "SLOW": "⚡", "SKIP": "⏭️", "OK": "✅", "WARNING": "⚠️", "CRITICAL": "🚨", "ERROR": "❌"}

    print("\n" + "═" * 60)
    print("  🛡️  RESTIN.AI — Deployment Monitor Report")
    print("═" * 60)
    print(f"  Time: {results['timestamp']}")
    print(f"  Overall: {icons.get(results['overall_status'], '?')} {results['overall_status']}")
    print("─" * 60)

    for check in results["checks"]:
        icon = icons.get(check["status"], "?")
        service = check["service"].upper()
        status = check["status"]
        msg = check.get("message", check.get("error", ""))
        latency = check.get("latency_ms")

        line = f"  {icon} {service:<12} {status:<10}"
        if latency:
            line += f" {latency:.0f}ms"
        if msg:
            line += f"  — {msg}"
        print(line)

    if "actions_taken" in results and results["actions_taken"]:
        print("─" * 60)
        print("  📋 Actions Taken:")
        for action in results["actions_taken"]:
            ok = "✅" if action["result"].get("ok") else "❌"
            print(f"    {ok} {action['action']} ({action['service']})")

    print("═" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Restin.AI Deployment Monitor")
    parser.add_argument("--verbose", "-v", action="store_true", help="Detailed output")
    parser.add_argument("--check-and-fix", action="store_true", help="Auto-redeploy on failure")
    parser.add_argument("--dry-run", action="store_true", help="Test without real API calls")
    parser.add_argument("--continuous", action="store_true", help="Run continuously at interval")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--deployments", action="store_true", help="Show recent deployments")
    args = parser.parse_args()

    config = load_config()

    # Check if any production URLs are configured
    if not config["frontend_url"] and not config["backend_url"]:
        print("\n⚠️  No production URLs configured.")
        print("   Set PRODUCTION_FRONTEND_URL and PRODUCTION_BACKEND_URL in backend/.env")
        print("   Example:")
        print("     PRODUCTION_FRONTEND_URL=https://restin.ai")
        print("     PRODUCTION_BACKEND_URL=https://restin-api.onrender.com")
        print()
        sys.exit(1)

    if args.deployments:
        print("\n📦 Recent Vercel Deployments:")
        for d in get_vercel_deployments(config):
            print(f"  {d.get('state', '?'):<10} {d.get('url', 'N/A')}")
        print("\n📦 Recent Render Deploys:")
        for d in get_render_deployments(config):
            deploy = d.get("deploy", d)
            print(f"  {deploy.get('status', '?'):<10} {deploy.get('id', 'N/A')}")
        return

    if args.continuous:
        run_continuous(config, verbose=args.verbose, dry_run=args.dry_run)
        return

    if args.check_and_fix:
        results = check_and_fix(config, dry_run=args.dry_run, verbose=args.verbose)
    else:
        results = run_health_check(config, verbose=args.verbose)

    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        print_report(results)

    # Exit code: 0 = healthy, 1 = degraded, 2 = down
    if results["overall_status"] == "DOWN":
        sys.exit(2)
    elif results["overall_status"] == "DEGRADED":
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
