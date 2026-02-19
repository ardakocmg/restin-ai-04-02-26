---
description: Check if backend and frontend are running and healthy, auto-restart if down
---

# Health Check & Auto-Recovery

## Quick Check (Local)

// turbo

```powershell
# Check Backend
$backendOk = try { (Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
# Check Frontend  
$frontendOk = try { (Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2).StatusCode -eq 200 } catch { $false }

if ($backendOk -and $frontendOk) {
    Write-Host "[OK] All services running" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Some services down:" -ForegroundColor Red
    if (-not $backendOk) { Write-Host "  - Backend (port 8000)" }
    if (-not $frontendOk) { Write-Host "  - Frontend (port 3000)" }
}
```

## Auto-Restart (if needed)

```powershell
# Restart Backend if down
if (-not $backendOk) {
    Write-Host "Restarting backend..."
    cd backend
    Start-Process powershell -ArgumentList "-Command", "python -m uvicorn app.main:app --reload --port 8000"
}

# Restart Frontend if down
if (-not $frontendOk) {
    Write-Host "Restarting frontend..."
    cd frontend
    Start-Process powershell -ArgumentList "-Command", "npm start"
}
```

## Production Health Check

// turbo

```powershell
python backend/scripts/deploy_monitor.py --verbose
```

## Production Auto-Recovery (if down)

```powershell
python backend/scripts/deploy_monitor.py --check-and-fix
```

---

**Manual Check:**

- Local Backend: <http://localhost:8000/docs>
- Local Frontend: <http://localhost:3000>
- Prod Monitor: `GET /api/system/monitor/status`
- Prod Redeploy: `/monitor-prod` workflow

---

## Quality Gates

- **No Animation Delays:** NEVER use `setTimeout` to gate login, navigation, or submissions. Instant callbacks only.
- **No 404 Before Commit:** Every UI route/link MUST have a working backend + page. Fix or hide before commit.
