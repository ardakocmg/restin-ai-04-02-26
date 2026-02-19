---
description: Monitor production Vercel/Render deployments, auto-fix if down
---

# Production Deployment Monitor

// turbo-all

## 1. Quick Status Check

```powershell
python backend/scripts/deploy_monitor.py --verbose
```

**Expected:** Shows health status for frontend, backend, and SSL.

## 2. Check + Auto-Fix (if down)

```powershell
python backend/scripts/deploy_monitor.py --check-and-fix
```

**Action:** If any service is DOWN, auto-triggers redeploy via API.

## 3. Show Recent Deployments

```powershell
python backend/scripts/deploy_monitor.py --deployments
```

**Shows:** Last 5 Vercel and Render deployments with status.

## 4. JSON Output (for automation)

```powershell
python backend/scripts/deploy_monitor.py --json
```

## 5. Continuous Monitoring (every 5 min)

```powershell
python backend/scripts/deploy_monitor.py --continuous --verbose
```

**Runs forever** — checks every 5 minutes, auto-redeploys after 3 consecutive failures.

## 6. Dry Run (test without real API calls)

```powershell
python backend/scripts/deploy_monitor.py --dry-run --check-and-fix
```

---

## API Endpoints (when backend is running)

| Endpoint | Description |
|----------|-------------|
| `GET /api/system/monitor/status` | Current health status |
| `GET /api/system/monitor/deployments` | Recent deploy history |
| `POST /api/system/monitor/redeploy/vercel` | Force Vercel redeploy |
| `POST /api/system/monitor/redeploy/render` | Force Render redeploy |
| `GET /api/system/monitor/config` | Check what's configured |

---

## Required Env Vars (in backend/.env)

```
PRODUCTION_FRONTEND_URL=https://restin.ai
PRODUCTION_BACKEND_URL=https://YOUR_RENDER_URL.onrender.com
VERCEL_TOKEN=your_token
VERCEL_PROJECT_ID=your_project_id
RENDER_API_KEY=your_key
RENDER_SERVICE_ID=your_service_id
MONITOR_WEBHOOK_URL=https://discord.com/api/webhooks/...  (optional)
```
