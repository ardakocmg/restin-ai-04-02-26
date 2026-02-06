# Backend & Frontend Health Check Workflow
---
description: Check if backend and frontend are running and healthy, auto-restart if down
---

// turbo-all

This workflow checks and auto-restarts servers if they're down.

## Step 1: Quick Health Check

```powershell
$backend = try { (Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2).StatusCode } catch { "DOWN" }
$frontend = try { (Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2).StatusCode } catch { "DOWN" }
Write-Host "Backend: $backend | Frontend: $frontend"
```

## Step 2: Auto-Restart Backend (if down)

If backend is DOWN:

```powershell
cd C:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

## Step 3: Auto-Restart Frontend (if down)

If frontend is DOWN:

```powershell
cd C:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\frontend
npm start
```

## One-Liner: Check & Report

```powershell
$b = try { (Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2).StatusCode } catch { "DOWN" }; $f = try { (Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2).StatusCode } catch { "DOWN" }; Write-Host "Backend: $b | Frontend: $f"
```

## Start Both (New Terminals)

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\backend'; python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\frontend'; npm start"
```

## Auto-Restart Script (Background Monitor)

Save as `monitor.ps1` and run to continuously monitor:

```powershell
while ($true) {
    $backend = try { (Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction Stop).StatusCode } catch { $null }
    $frontend = try { (Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop).StatusCode } catch { $null }
    
    if (-not $backend) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Backend DOWN - Restarting..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\backend'; python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
    }
    
    if (-not $frontend) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Frontend DOWN - Restarting..."
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\MG Group\.gemini\antigravity\scratch\main-new2801-with-hr\frontend'; npm start"
    }
    
    Start-Sleep -Seconds 30
}
```
