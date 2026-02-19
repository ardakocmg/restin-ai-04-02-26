# ═══════════════════════════════════════════════════════════════════
# 🚨 RESTIN.AI — Emergency Recovery Script
# ═══════════════════════════════════════════════════════════════════
# Use when things go wrong: merge conflicts, corrupted state, etc.
#
# Usage: .\scripts\emergency-recovery.ps1
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚨 RESTIN.AI — Emergency Recovery" -ForegroundColor Red
Write-Host "══════════════════════════════════" -ForegroundColor Red
Write-Host ""
Write-Host "Choose recovery option:" -ForegroundColor Yellow
Write-Host "  [1] 💾 BACKUP & RESET — Save my work, reset to remote state" -ForegroundColor White
Write-Host "  [2] 🔀 FIX CONFLICTS — Auto-resolve merge conflicts (keep mine)" -ForegroundColor White
Write-Host "  [3] ⏪ UNDO LAST COMMIT — Revert the last commit (keep files)" -ForegroundColor White
Write-Host "  [4] 🗑️  DISCARD ALL — Throw away ALL local changes, match remote exactly" -ForegroundColor White
Write-Host "  [5] 📋 DIAGNOSE — Show me what's wrong" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter 1-5"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "💾 Creating backup..." -ForegroundColor Yellow
        
        $backupDir = "$env:USERPROFILE\Desktop\restin-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        
        # Save uncommitted changes as a patch
        $patchFile = "$backupDir\uncommitted-changes.patch"
        git diff > $patchFile 2>$null
        git diff --staged >> $patchFile 2>$null
        
        # Copy modified files
        $modifiedFiles = git diff --name-only HEAD 2>$null
        if ($modifiedFiles) {
            foreach ($f in $modifiedFiles) {
                $destPath = "$backupDir\files\$f"
                $destDir = Split-Path $destPath -Parent
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                Copy-Item $f $destPath -Force 2>$null
            }
        }
        
        Write-Host "  ✅ Backup saved to: $backupDir" -ForegroundColor Green
        
        # Reset to remote
        Write-Host "  Resetting to remote state..." -ForegroundColor Yellow
        git fetch origin
        git reset --hard origin/main
        git clean -fd
        
        Write-Host "  ✅ Reset complete — matches remote exactly" -ForegroundColor Green
        Write-Host "  📁 Your backup: $backupDir" -ForegroundColor Cyan
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔀 Fixing merge conflicts (keeping YOUR version)..." -ForegroundColor Yellow
        
        $conflicts = git diff --name-only --diff-filter=U
        if (-not $conflicts) {
            Write-Host "  No merge conflicts found!" -ForegroundColor Green
        }
        else {
            foreach ($f in $conflicts) {
                Write-Host "  Resolving: $f (keeping ours)" -ForegroundColor DarkGray
                git checkout --ours $f
                git add $f
            }
            git commit -m "fix: resolved merge conflicts (kept local versions)" --no-verify
            Write-Host "  ✅ All conflicts resolved" -ForegroundColor Green
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "⏪ Undoing last commit..." -ForegroundColor Yellow
        
        $lastCommit = git log --oneline -1
        Write-Host "  Last commit: $lastCommit" -ForegroundColor White
        $confirm = Read-Host "  Undo this commit? Files will be KEPT. (y/N)"
        
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            git reset --soft HEAD~1
            Write-Host "  ✅ Commit undone — files are still modified" -ForegroundColor Green
        }
        else {
            Write-Host "  Aborted." -ForegroundColor DarkGray
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "🗑️  THIS WILL DESTROY ALL LOCAL CHANGES!" -ForegroundColor Red
        $confirm = Read-Host "  Type 'CONFIRM' to proceed"
        
        if ($confirm -eq "CONFIRM") {
            git fetch origin
            git reset --hard origin/main
            git clean -fd
            Write-Host "  ✅ Everything reset to remote state" -ForegroundColor Green
        }
        else {
            Write-Host "  Aborted." -ForegroundColor DarkGray
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "📋 Diagnosis Report" -ForegroundColor Cyan
        Write-Host "═══════════════════" -ForegroundColor Cyan
        
        Write-Host "`n--- Branch Status ---" -ForegroundColor Yellow
        git status
        
        Write-Host "`n--- Commits Ahead/Behind ---" -ForegroundColor Yellow
        git fetch origin 2>$null
        $ahead = (git log origin/main..HEAD --oneline 2>$null | Measure-Object -Line).Lines
        $behind = (git log HEAD..origin/main --oneline 2>$null | Measure-Object -Line).Lines
        Write-Host "  Ahead:  $ahead commits"
        Write-Host "  Behind: $behind commits"
        
        Write-Host "`n--- Merge Conflicts ---" -ForegroundColor Yellow
        $conflicts = git diff --name-only --diff-filter=U 2>$null
        if ($conflicts) {
            $conflicts | ForEach-Object { Write-Host "  ⚠️  $_" -ForegroundColor Red }
        }
        else {
            Write-Host "  None" -ForegroundColor Green
        }
        
        Write-Host "`n--- Modified Files ---" -ForegroundColor Yellow
        $modified = git diff --name-only 2>$null
        if ($modified) {
            $modified | ForEach-Object { Write-Host "  📝 $_" -ForegroundColor White }
        }
        else {
            Write-Host "  Clean working directory" -ForegroundColor Green
        }
        
        Write-Host "`n--- Worklock Status ---" -ForegroundColor Yellow
        $lockFile = Join-Path (git rev-parse --show-toplevel) ".worklock"
        if (Test-Path $lockFile) {
            $lockContent = Get-Content $lockFile -Raw
            if ([string]::IsNullOrWhiteSpace($lockContent)) {
                Write-Host "  🟢 No active locks" -ForegroundColor Green
            }
            else {
                Write-Host $lockContent -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  🟢 No lock file" -ForegroundColor Green
        }
        
        Write-Host "`n--- Last 5 Commits ---" -ForegroundColor Yellow
        git log --oneline -5
    }
    
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to exit"
