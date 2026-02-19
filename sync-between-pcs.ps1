# ═══════════════════════════════════════════════════════════════════
# 🔄 RESTIN.AI — Quick Sync Between PCs
# ═══════════════════════════════════════════════════════════════════
# Run this BEFORE starting work on ANY PC to stay in sync.
# Usage: .\sync-between-pcs.ps1
# ═══════════════════════════════════════════════════════════════════

param(
    [switch]$Push,
    [switch]$Pull
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔄 RESTIN.AI — PC Sync Tool" -ForegroundColor Cyan
Write-Host "═══════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check for uncommitted changes
$status = git status --porcelain
$hasChanges = $status.Length -gt 0

if (-not $Push -and -not $Pull) {
    Write-Host "Choose an action:" -ForegroundColor Yellow
    Write-Host "  [1] 📤 PUSH — Send my work to remote (done working on this PC)" -ForegroundColor White
    Write-Host "  [2] 📥 PULL — Get latest from remote (starting work on this PC)" -ForegroundColor White
    Write-Host "  [3] 📊 STATUS — Check sync state" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Enter 1, 2, or 3"
    
    switch ($choice) {
        "1" { $Push = $true }
        "2" { $Pull = $true }
        "3" {
            Write-Host ""
            git status
            Write-Host ""
            $localCommit = git rev-parse HEAD
            $remoteCommit = git rev-parse origin/main 2>$null
            if ($localCommit -eq $remoteCommit) {
                Write-Host "✅ In sync with remote" -ForegroundColor Green
            }
            else {
                $ahead = (git log origin/main..HEAD --oneline | Measure-Object -Line).Lines
                $behind = (git log HEAD..origin/main --oneline | Measure-Object -Line).Lines
                if ($ahead -gt 0) { Write-Host "  📤 $ahead commits ahead (need PUSH)" -ForegroundColor Yellow }
                if ($behind -gt 0) { Write-Host "  📥 $behind commits behind (need PULL)" -ForegroundColor Yellow }
            }
            Read-Host "`nPress Enter to exit"
            exit 0
        }
        default {
            Write-Host "Invalid choice" -ForegroundColor Red
            exit 1
        }
    }
}

if ($Push) {
    Write-Host "📤 Pushing your work..." -ForegroundColor Yellow
    
    if ($hasChanges) {
        Write-Host "  Staging changes..." -ForegroundColor DarkGray
        git add -A
        
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $pcName = $env:COMPUTERNAME
        $defaultMsg = "sync: $pcName @ $timestamp"
        
        $msg = Read-Host "  Commit message (Enter for '$defaultMsg')"
        if ([string]::IsNullOrWhiteSpace($msg)) { $msg = $defaultMsg }
        
        git commit -m $msg
        Write-Host "  ✅ Committed" -ForegroundColor Green
    }
    else {
        Write-Host "  No uncommitted changes" -ForegroundColor DarkGray
    }
    
    Write-Host "  Pushing to remote..." -ForegroundColor DarkGray
    git push origin main
    Write-Host "  ✅ Pushed successfully!" -ForegroundColor Green
}

if ($Pull) {
    Write-Host "📥 Pulling latest..." -ForegroundColor Yellow
    
    if ($hasChanges) {
        Write-Host "  ⚠️  You have uncommitted changes! Stashing..." -ForegroundColor DarkYellow
        git stash push -m "auto-stash before pull"
        $stashed = $true
    }
    
    git pull origin main
    Write-Host "  ✅ Pulled successfully!" -ForegroundColor Green
    
    if ($stashed) {
        Write-Host "  Restoring stashed changes..." -ForegroundColor DarkGray
        git stash pop
        Write-Host "  ✅ Stash restored" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Sync complete!" -ForegroundColor Green
Write-Host "═══════════════════════════" -ForegroundColor Cyan

Read-Host "`nPress Enter to exit"
