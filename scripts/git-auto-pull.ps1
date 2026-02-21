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

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
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
        Write-Log "Local changes detected — stashing before pull..." "Yellow"
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
        Write-Log "Pull successful! Codebase updated." "Green"
        # Play a beep to notify
        [console]::beep(800, 200)
        [console]::beep(1000, 150)
    } else {
        Write-Log "Pull failed! Manual intervention needed." "Red"
        Write-Log $pullResult "Red"
        [console]::beep(400, 500)
    }

    return $success
}

# === MAIN LOOP ===

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   Restin.AI Git Auto-Pull Watcher  v1.0   ║" -ForegroundColor Cyan
Write-Host "  ║   Polling every ${Interval}s for remote changes    ║" -ForegroundColor Cyan
Write-Host "  ║   Press Ctrl+C to stop                    ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Log "Watching: $repoRoot" "DarkCyan"
Write-Log "Remote: origin/main" "DarkCyan"
Write-Host ""

$pullCount = 0

do {
    try {
        $behind = Get-BehindCount
        if ($behind -gt 0) {
            Write-Log "Remote is $behind commit(s) ahead — triggering auto-pull!" "Magenta"
            $ok = Invoke-AutoPull
            if ($ok) { $pullCount++ }
            Write-Log "Total auto-pulls this session: $pullCount" "DarkCyan"
        } else {
            Write-Log "Up to date with origin/main" "DarkGreen"
        }
    } catch {
        Write-Log "Error checking remote: $_" "Red"
    }

    if (-not $Once) {
        Start-Sleep -Seconds $Interval
    }
} while (-not $Once)

if ($Once) {
    Write-Log "Single check complete. Exiting." "Gray"
}
