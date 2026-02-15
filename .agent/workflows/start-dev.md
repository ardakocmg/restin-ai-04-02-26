---
description: Start all servers and verify system health
---

# Start Restin.AI Development Environment

## ⚠️ CRITICAL RULE

**ALWAYS use `app.main:app` as the backend entry point. NEVER use `server.py` directly.**

- `server.py` content was merged into `app/main.py` on 2026-02-15.
- `_server_legacy.py` exists only as a backup reference — DO NOT USE IT.
- Auth response uses `accessToken` key (not `token`).

## 1. Kill old processes

```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*python*"} | Stop-Process -Force
```

## 2. Start Backend (FastAPI)

// turbo

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Expected:** Backend running on `http://localhost:8000`
**Entry point:** `app.main:app` — this is the ONLY valid entry point.

## 3. Start Frontend (React)

// turbo

```powershell
cd frontend
npm start
```

**Expected:** Frontend running on `http://localhost:3000`

## 4. Verify Health

// turbo

```powershell
Start-Sleep -Seconds 10
curl http://localhost:8000/health
curl http://localhost:3000
```

**Success:** Both URLs return 200 OK

## 5. Seed Database (if needed)

```powershell
cd backend
python seed_data.py
```

---

**Quick Access:**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:8000>
- API Docs: <http://localhost:8000/docs>

**Test Login:** PIN `0000` (Product Owner - Arda Koc)
