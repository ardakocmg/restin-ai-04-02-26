# ═══════════════════════════════════════════════════════════════════
# 🔒 RESTIN.AI — Work Lock System
# ═══════════════════════════════════════════════════════════════════
# Signals to the other PC what files/areas you're working on.
#
# Usage:
#   .\scripts\worklock.ps1 lock "Working on POS pages" "POSScreen.tsx,PaymentScreen.jsx"
#   .\scripts\worklock.ps1 unlock
#   .\scripts\worklock.ps1 status
# ═══════════════════════════════════════════════════════════════════

param(
    [Parameter(Position = 0)]
    [ValidateSet("lock", "unlock", "status", "check")]
    [string]$Action = "status",

    [Parameter(Position = 1)]
    [string]$Description = "",

    [Parameter(Position = 2)]
    [string]$Files = ""
)

$ProjectRoot = (git rev-parse --show-toplevel 2>$null) ?? (Split-Path $PSScriptRoot -Parent)
$LockFile = Join-Path $ProjectRoot ".worklock"
$PCName = $env:COMPUTERNAME
$User = $env:USERNAME
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Show-Lock {
    if (Test-Path $LockFile) {
        $content = Get-Content $LockFile -Raw
        if ([string]::IsNullOrWhiteSpace($content)) {
            Write-Host "🟢 No active locks" -ForegroundColor Green
        }
        else {
            Write-Host "🔒 Active Lock:" -ForegroundColor Yellow
            Write-Host $content -ForegroundColor White
        }
    }
    else {
        Write-Host "🟢 No active locks" -ForegroundColor Green
    }
}

function Test-Lock {
    param([string]$FilesToCheck)
    
    if (-not (Test-Path $LockFile)) { return $false }
    $content = Get-Content $LockFile -Raw
    if ([string]::IsNullOrWhiteSpace($content)) { return $false }
    
    # Parse locked files
    $lockData = $content | Select-String "LOCKED_FILES: (.*)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
    if (-not $lockData) { return $false }
    
    $lockedFiles = $lockData -split ","
    $checkFiles = $FilesToCheck -split ","
    
    foreach ($cf in $checkFiles) {
        foreach ($lf in $lockedFiles) {
            if ($cf.Trim() -eq $lf.Trim()) {
                $lockedBy = ($content | Select-String "PC: (.*)").Matches[0].Groups[1].Value
                if ($lockedBy -ne $PCName) {
                    Write-Host "⛔ BLOCKED: '$($cf.Trim())' is locked by $lockedBy" -ForegroundColor Red
                    return $true
                }
            }
        }
    }
    return $false
}

switch ($Action) {
    "lock" {
        if ([string]::IsNullOrWhiteSpace($Description)) {
            $Description = Read-Host "What are you working on?"
        }
        
        # Check if someone else has a lock
        if (Test-Path $LockFile) {
            $existing = Get-Content $LockFile -Raw
            $existingPC = ($existing | Select-String "PC: (.*)").Matches[0].Groups[1].Value
            if ($existingPC -and $existingPC -ne $PCName) {
                Write-Host "⚠️  WARNING: $existingPC has an active lock!" -ForegroundColor Red
                Write-Host $existing -ForegroundColor DarkYellow
                $confirm = Read-Host "Override? (y/N)"
                if ($confirm -ne "y" -and $confirm -ne "Y") {
                    Write-Host "Aborted." -ForegroundColor DarkGray
                    exit 0
                }
            }
        }

        $lockContent = @"
# ═══════════════════════════════════════
# 🔒 WORK LOCK — DO NOT EDIT THESE FILES
# ═══════════════════════════════════════
PC: $PCName
USER: $User
TIME: $Timestamp
DESCRIPTION: $Description
LOCKED_FILES: $Files
"@
        $lockContent | Out-File -Encoding UTF8 $LockFile -Force
        
        # Auto-push the lock
        git add $LockFile 2>$null
        git commit -m "worklock: $PCName locked — $Description" --no-verify 2>$null
        git push origin main 2>$null
        
        Write-Host "🔒 Lock acquired!" -ForegroundColor Green
        Write-Host "   PC: $PCName" -ForegroundColor White
        Write-Host "   Files: $Files" -ForegroundColor White
        Write-Host "   Description: $Description" -ForegroundColor White
    }
    
    "unlock" {
        if (Test-Path $LockFile) {
            # Clear the file (don't delete — keep in git)
            "" | Out-File -Encoding UTF8 $LockFile -Force
            
            git add $LockFile 2>$null
            git commit -m "worklock: $PCName unlocked" --no-verify 2>$null
            git push origin main 2>$null
            
            Write-Host "🟢 Lock released!" -ForegroundColor Green
        }
        else {
            Write-Host "🟢 No lock to release" -ForegroundColor Green
        }
    }
    
    "status" {
        # Fetch latest first
        git fetch origin 2>$null
        git checkout origin/main -- $LockFile 2>$null
        Show-Lock
    }
    
    "check" {
        if ([string]::IsNullOrWhiteSpace($Files)) {
            Write-Host "Usage: .\worklock.ps1 check 'file1.tsx,file2.py'" -ForegroundColor Yellow
            exit 1
        }
        $blocked = Test-Lock $Files
        if ($blocked) {
            exit 1
        }
        else {
            Write-Host "🟢 Files are available" -ForegroundColor Green
            exit 0
        }
    }
}
