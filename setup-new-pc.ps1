# ═══════════════════════════════════════════════════════════════════
# 🚀 RESTIN.AI — New PC Auto-Setup Script
# ═══════════════════════════════════════════════════════════════════
# Usage: Right-click → Run with PowerShell
# OR: Open PowerShell as Admin → .\setup-new-pc.ps1
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ProjectName = "restin-ai"
$GitRepo = "https://github.com/ardakocmg/restin-ai-04-02-26.git"
$InstallDir = "$env:USERPROFILE\.gemini\antigravity\scratch\$ProjectName"

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 RESTIN.AI — Auto Setup for New PC" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Step 0: Pre-requisite Check ───
Write-Host "[0/7] Checking prerequisites..." -ForegroundColor Yellow

$missing = @()

# Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $missing += "Git (https://git-scm.com)" }

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "Node.js v18+ (https://nodejs.org)" }

# Check Python
$pythonCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" }
             elseif (Get-Command python3 -ErrorAction SilentlyContinue) { "python3" }
             else { $null }
if (-not $pythonCmd) { $missing += "Python 3.10+ (https://python.org)" }

if ($missing.Count -gt 0) {
    Write-Host "  ❌ Missing prerequisites:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "     - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Install the missing tools and re-run this script." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVer = node --version
$gitVer = git --version
$pyVer = & $pythonCmd --version 2>&1
Write-Host "  ✅ Git: $gitVer" -ForegroundColor Green
Write-Host "  ✅ Node: $nodeVer" -ForegroundColor Green
Write-Host "  ✅ Python: $pyVer" -ForegroundColor Green

# ─── Step 1: Clone Repository ───
Write-Host ""
Write-Host "[1/7] Cloning repository..." -ForegroundColor Yellow

if (Test-Path $InstallDir) {
    Write-Host "  ⚠️  Directory already exists: $InstallDir" -ForegroundColor DarkYellow
    $choice = Read-Host "  Overwrite? (y/N)"
    if ($choice -eq "y" -or $choice -eq "Y") {
        Remove-Item -Recurse -Force $InstallDir
    } else {
        Write-Host "  Skipping clone, using existing directory." -ForegroundColor DarkYellow
    }
}

if (-not (Test-Path $InstallDir)) {
    # Create parent directory
    $parentDir = Split-Path $InstallDir -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    }
    git clone $GitRepo $InstallDir
    Write-Host "  ✅ Cloned to $InstallDir" -ForegroundColor Green
} else {
    Set-Location $InstallDir
    git pull origin main
    Write-Host "  ✅ Pulled latest changes" -ForegroundColor Green
}

Set-Location $InstallDir

# ─── Step 2: Backend Python Dependencies ───
Write-Host ""
Write-Host "[2/7] Installing backend dependencies..." -ForegroundColor Yellow

Set-Location "$InstallDir\backend"

# Create virtual environment if not exists
if (-not (Test-Path "venv")) {
    & $pythonCmd -m venv venv
    Write-Host "  ✅ Virtual environment created" -ForegroundColor Green
}

# Activate and install
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt --quiet 2>$null
Write-Host "  ✅ Python packages installed" -ForegroundColor Green

# ─── Step 3: Frontend Node Dependencies ───
Write-Host ""
Write-Host "[3/7] Installing frontend dependencies..." -ForegroundColor Yellow

Set-Location "$InstallDir\frontend"
npm install --silent 2>$null
Write-Host "  ✅ Node modules installed" -ForegroundColor Green

# ─── Step 4: Environment Files ───
Write-Host ""
Write-Host "[4/7] Setting up environment files..." -ForegroundColor Yellow

# Backend .env
$backendEnvPath = "$InstallDir\backend\.env"
if (-not (Test-Path $backendEnvPath)) {
    @"
# ═══════════════════════════════════════════
# Restin.AI Backend Environment
# ═══════════════════════════════════════════
MONGODB_URI=mongodb+srv://ardakoc:Turkuaz123@cluster0.mongodb.net/restin_ai?retryWrites=true&w=majority
SECRET_KEY=restin-ai-super-secret-key-2026
JWT_SECRET=restin-ai-jwt-secret-2026
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
"@ | Out-File -Encoding UTF8 $backendEnvPath
    Write-Host "  ✅ backend/.env created (UPDATE MongoDB URI!)" -ForegroundColor Green
    Write-Host "  ⚠️  IMPORTANT: Edit $backendEnvPath with your real MongoDB Atlas URI" -ForegroundColor DarkYellow
} else {
    Write-Host "  ✅ backend/.env already exists" -ForegroundColor Green
}

# Frontend .env
$frontendEnvPath = "$InstallDir\frontend\.env"
if (-not (Test-Path $frontendEnvPath)) {
    @"
# ═══════════════════════════════════════════
# Restin.AI Frontend Environment
# ═══════════════════════════════════════════
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
"@ | Out-File -Encoding UTF8 $frontendEnvPath
    Write-Host "  ✅ frontend/.env created" -ForegroundColor Green
} else {
    Write-Host "  ✅ frontend/.env already exists" -ForegroundColor Green
}

# ─── Step 5: Git Pre-Commit Hook ───
Write-Host ""
Write-Host "[5/7] Setting up Git hooks..." -ForegroundColor Yellow

$hookSource = "$InstallDir\frontend\.husky\pre-commit"
if (Test-Path $hookSource) {
    Write-Host "  ✅ Pre-commit hook already configured" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No pre-commit hook found (will be installed on first commit)" -ForegroundColor DarkYellow
}

# ─── Step 6: Verify Installation ───
Write-Host ""
Write-Host "[6/7] Verifying installation..." -ForegroundColor Yellow

Set-Location $InstallDir

$checks = @(
    @{ Name = "Backend routes";    Path = "backend/routes";         Expected = 140 }
    @{ Name = "Frontend pages";    Path = "frontend/src/pages";     Expected = 300 }
    @{ Name = "Backend main.py";   Path = "backend/app/main.py";    Expected = $null }
    @{ Name = "Frontend App.tsx";  Path = "frontend/src/App.tsx";   Expected = $null }
    @{ Name = "Node modules";      Path = "frontend/node_modules";  Expected = $null }
    @{ Name = "Python venv";       Path = "backend/venv";           Expected = $null }
)

$allGood = $true
foreach ($check in $checks) {
    $path = Join-Path $InstallDir $check.Path
    if (Test-Path $path) {
        if ($check.Expected) {
            $count = (Get-ChildItem -Recurse -File $path -ErrorAction SilentlyContinue | Measure-Object).Count
            if ($count -ge $check.Expected) {
                Write-Host "  ✅ $($check.Name): $count files" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $($check.Name): $count files (expected $($check.Expected)+)" -ForegroundColor DarkYellow
            }
        } else {
            Write-Host "  ✅ $($check.Name)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ $($check.Name) — NOT FOUND" -ForegroundColor Red
        $allGood = $false
    }
}

# ─── Step 7: Summary ───
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  SETUP COMPLETE WITH WARNINGS" -ForegroundColor DarkYellow
}
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📁 Project: $InstallDir" -ForegroundColor White
Write-Host ""
Write-Host "  To start working:" -ForegroundColor White
Write-Host "  ─────────────────" -ForegroundColor DarkGray
Write-Host "  1. Open VS Code:  code $InstallDir" -ForegroundColor White
Write-Host "  2. Backend:       cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "  3. Frontend:      cd frontend && npm start" -ForegroundColor White
Write-Host ""
Write-Host "  Daily sync:" -ForegroundColor White
Write-Host "  ────────────" -ForegroundColor DarkGray
Write-Host "  Pull:  git pull origin main" -ForegroundColor White
Write-Host "  Push:  git add . && git commit -m 'msg' && git push" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
