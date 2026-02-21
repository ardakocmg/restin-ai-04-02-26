<#
.SYNOPSIS
    Git Auto-Pull Watcher for Restin.AI Dual-PC Setup
.DESCRIPTION
    Polls the remote git repo every N seconds. When it detects new commits
    on origin/main that are ahead of local main, it automatically pulls.
    Designed to run on PC2 so it stays in sync when PC1 pushes.
.USAGE
    .\scripts\git-auto-pull.ps1              # Default: poll every 30s
    .\scripts\git-auto-pull.ps1 -Interval 15 # Poll every 15s
    .\scripts\git-auto-pull.ps1 -Once        # Check once and exit
#>

param(
    [int]$Interval = 30,
    [switch]$Once = $false
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$host.UI.RawUI.WindowTitle = "Restin.AI Git Auto-Pull Watcher"
$SyncLogFile = Join-Path (Join-Path $repoRoot ".agent") "sync-log.txt"
$agentDir = Join-Path $repoRoot ".agent"
if (-not (Test-Path $agentDir)) { New-Item -ItemType Directory -Path $agentDir -Force | Out-Null }

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
}

function Write-SyncLog {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$ts] $Message" | Out-File -Append -Encoding UTF8 $SyncLogFile
}

function Show-Toast {
    param([string]$Title, [string]$Message)
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $balloon = New-Object System.Windows.Forms.NotifyIcon
        $balloon.Icon = [System.Drawing.SystemIcons]::Information
        $balloon.BalloonTipIcon = "Info"
        $balloon.BalloonTipTitle = $Title
        $balloon.BalloonTipText = $Message
        $balloon.Visible = $true
        $balloon.ShowBalloonTip(5000)
        Start-Sleep -Milliseconds 5500
        $balloon.Dispose()
    }
    catch {}
}

function Test-UncommittedChanges {
    $status = git status --porcelain 2>$null
    return ($null -ne $status -and $status.Length -gt 0)
}

function Get-BehindCount {
    git fetch origin 2>$null | Out-Null
    $behindAhead = git rev-list --left-right --count "HEAD...origin/main" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $behindAhead) { return 0 }
    $parts = $behindAhead -split '\s+'
    if ($parts.Count -ge 2) { return [int]$parts[1] }
    return 0
}

function Invoke-AutoPull {
    $hasLocal = Test-UncommittedChanges
    if ($hasLocal) {
        Write-Log "Local changes detected -- stashing before pull..." "Yellow"
        git stash push -m "auto-pull-watcher-stash" 2>$null | Out-Null
    }

    Write-Log "Pulling from origin/main..." "Cyan"
    $pullResult = git pull origin main 2>&1
    $success = $LASTEXITCODE -eq 0

    if ($hasLocal) {
        Write-Log "Restoring stashed changes..." "Yellow"
        git stash pop 2>$null | Out-Null
    }

    if ($success) {
        $commitMsg = git log -1 --format="%s" 2>$null
        Write-Log "[OK] Pull successful! Codebase updated." "Green"
        Write-Log "Latest: $commitMsg" "DarkCyan"
        [console]::beep(800, 200)
        [console]::beep(1000, 150)
        Write-SyncLog "PULL OK: $commitMsg"
        Show-Toast "Restin.AI Sync" "Code updated: $commitMsg"
    }
    else {
        Write-Log "[FAIL] Pull failed! Manual intervention needed." "Red"
        Write-Log $pullResult "Red"
        [console]::beep(400, 500)
    }

    return $success
}

# === MAIN LOOP ===

Write-Host ""
Write-Host "  +=============================================+" -ForegroundColor Cyan
Write-Host "  |   Restin.AI Git Auto-Pull Watcher  v1.0     |" -ForegroundColor Cyan
Write-Host "  |   Polling every ${Interval}s for remote changes      |" -ForegroundColor Cyan
Write-Host "  |   Press Ctrl+C to stop                      |" -ForegroundColor Cyan
Write-Host "  +=============================================+" -ForegroundColor Cyan
Write-Host ""

Write-Log "Watching: $repoRoot" "DarkCyan"
Write-Log "Remote: origin/main" "DarkCyan"
Write-Host ""

$pullCount = 0

do {
    try {
        $behind = Get-BehindCount
        if ($behind -gt 0) {
            Write-Log "Remote is $behind commit(s) ahead -- triggering auto-pull!" "Magenta"
            $ok = Invoke-AutoPull
            if ($ok) {
                $pullCount++
                # Run post-pull health check
                $healthScript = Join-Path $PSScriptRoot "health-check-post-pull.ps1"
                if (Test-Path $healthScript) {
                    Write-Log "Running post-pull health check..." "Cyan"
                    & $healthScript
                }
                # Show pending tasks
                $taskScript = Join-Path $PSScriptRoot "task-queue.ps1"
                if (Test-Path $taskScript) {
                    & $taskScript list
                }
            }
            Write-Log "Total auto-pulls this session: $pullCount" "DarkCyan"
        }
        else {
            Write-Log "Up to date with origin/main" "DarkGreen"
        }
    }
    catch {
        Write-Log "Error checking remote: $_" "Red"
    }

    if (-not $Once) {
        Start-Sleep -Seconds $Interval
    }
} while (-not $Once)

if ($Once) {
    Write-Log "Single check complete. Exiting." "Gray"
}
