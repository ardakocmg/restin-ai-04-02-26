---
description: Check if backend and frontend are running and healthy, auto-restart if down
---

# Health Check & Auto-Recovery

## Quick Check

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

---

**Manual Check:**

- Backend: <http://localhost:8000/docs>
- Frontend: <http://localhost:3000>

---

## ⚡ Quality Gates

- **No Animation Delays:** NEVER use `setTimeout` to gate login, navigation, or submissions. Instant callbacks only.
- **No 404 Before Commit:** Every UI route/link MUST have a working backend + page. Fix or hide before commit.
