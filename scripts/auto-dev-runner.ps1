<#
.SYNOPSIS
    Auto Dev Runner -- Keeps dev servers running on PC2, restarts after pulls
.DESCRIPTION
    Monitors the git repo for changes. When a pull happens:
    1. If package.json changed -> runs npm install
    2. Restarts frontend dev server
    3. Restarts backend dev server
    Keeps servers alive and healthy without manual intervention.
.USAGE
    .\scripts\auto-dev-runner.ps1                    # Watch + run both servers
    .\scripts\auto-dev-runner.ps1 -FrontendOnly      # Only frontend
    .\scripts\auto-dev-runner.ps1 -BackendOnly       # Only backend
#>

param(
    [switch]$FrontendOnly = $false,
    [switch]$BackendOnly = $false
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$PCName = $env:COMPUTERNAME
$host.UI.RawUI.WindowTitle = "Restin.AI Auto Dev Runner ($PCName)"

$FrontendDir = Join-Path $repoRoot "frontend"
$BackendDir = Join-Path $repoRoot "backend"
$PkgHashFile = Join-Path (Join-Path $repoRoot ".agent") "pkg-hash-$($PCName.ToLower()).txt"

# Ensure .agent dir
$agentDir = Join-Path $repoRoot ".agent"
if (-not (Test-Path $agentDir)) { New-Item -ItemType Directory -Path $agentDir -Force | Out-Null }

# Track server processes
$script:feProcess = $null
$script:beProcess = $null

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
}

function Get-PkgHash {
    $pkgFile = Join-Path $FrontendDir "package.json"
    if (Test-Path $pkgFile) {
        return (Get-FileHash $pkgFile -Algorithm MD5).Hash
    }
    return ""
}

function Test-NpmInstallNeeded {
    $currentHash = Get-PkgHash
    $savedHash = ""
    if (Test-Path $PkgHashFile) {
        $savedHash = Get-Content $PkgHashFile -Raw -ErrorAction SilentlyContinue
        if ($savedHash) { $savedHash = $savedHash.Trim() }
    }
    if ($currentHash -ne $savedHash) {
        $currentHash | Out-File -Encoding UTF8 $PkgHashFile -Force
        return $true
    }
    return $false
}

function Start-Frontend {
    if ($script:feProcess -and -not $script:feProcess.HasExited) {
        Write-Log "Stopping frontend server..." "Yellow"
        Stop-Process -Id $script:feProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Check if npm install needed
    if (Test-NpmInstallNeeded) {
        Write-Log "package.json changed -- running npm install..." "Cyan"
        Set-Location $FrontendDir
        npm install 2>&1 | Out-Null
        Set-Location $repoRoot
        Write-Log "npm install complete" "Green"
    }

    Write-Log "Starting frontend dev server..." "Cyan"
    $script:feProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$FrontendDir`" && npm run dev" -PassThru -WindowStyle Normal
    Write-Log "Frontend started (PID: $($script:feProcess.Id))" "Green"
}

function Start-Backend {
    if ($script:beProcess -and -not $script:beProcess.HasExited) {
        Write-Log "Stopping backend server..." "Yellow"
        Stop-Process -Id $script:beProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    Write-Log "Starting backend dev server..." "Cyan"
    $script:beProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$BackendDir`" && python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000" -PassThru -WindowStyle Normal
    Write-Log "Backend started (PID: $($script:beProcess.Id))" "Green"
}

function Restart-Servers {
    Write-Log "=== RESTARTING DEV SERVERS ===" "Magenta"
    if (-not $BackendOnly) { Start-Frontend }
    if (-not $FrontendOnly) { Start-Backend }
    Write-Log "=== SERVERS RESTARTED ===" "Green"
    [console]::beep(600, 100)
    [console]::beep(800, 100)
    [console]::beep(1000, 100)
}

function Test-ServersAlive {
    $feAlive = $true
    $beAlive = $true

    if (-not $BackendOnly) {
        if ($null -eq $script:feProcess -or $script:feProcess.HasExited) {
            $feAlive = $false
        }
    }
    if (-not $FrontendOnly) {
        if ($null -eq $script:beProcess -or $script:beProcess.HasExited) {
            $beAlive = $false
        }
    }
    return @{ Frontend = $feAlive; Backend = $beAlive }
}

# === MAIN ===
Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host "  |   Restin.AI Auto Dev Runner  v1.0           |" -ForegroundColor Green
Write-Host "  |   Auto-restart servers after pulls          |" -ForegroundColor Green
Write-Host "  |   Press Ctrl+C to stop                      |" -ForegroundColor Green
Write-Host "  +=============================================+" -ForegroundColor Green
Write-Host ""

# Initial start
Restart-Servers

# Save initial git hash
$lastCommit = git rev-parse HEAD 2>$null

# Monitor loop
while ($true) {
    Start-Sleep -Seconds 10

    try {
        # Check if commit changed (meaning a pull happened)
        $currentCommit = git rev-parse HEAD 2>$null
        if ($currentCommit -ne $lastCommit) {
            $commitMsg = git log -1 --format="%s" 2>$null
            Write-Log "New code detected: $commitMsg" "Magenta"
            $lastCommit = $currentCommit
            Restart-Servers
        }

        # Health check -- restart crashed servers
        $health = Test-ServersAlive
        if (-not $health.Frontend -and -not $BackendOnly) {
            Write-Log "Frontend crashed! Restarting..." "Red"
            Start-Frontend
        }
        if (-not $health.Backend -and -not $FrontendOnly) {
            Write-Log "Backend crashed! Restarting..." "Red"
            Start-Backend
        }
    }
    catch {
        Write-Log "Error: $_" "Red"
    }
}
