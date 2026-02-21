<#
.SYNOPSIS
    Auto-Lock — Watches for file changes and auto-locks them via worklock
.DESCRIPTION
    Monitors staged files (git diff --cached) or recently modified files and
    automatically creates a worklock entry. When you push, it auto-unlocks.
    Designed so the other PC sees what files you're touching in real-time.
.USAGE
    .\scripts\auto-lock.ps1              # Watch mode (default, polls every 10s)
    .\scripts\auto-lock.ps1 -Interval 5  # Poll every 5s
#>

param(
    [int]$Interval = 10
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$PCName = $env:COMPUTERNAME
$LockFile = Join-Path $repoRoot ".worklock"
$StatusFile = Join-Path $repoRoot ".agent" "status-$($PCName.ToLower()).json"

$host.UI.RawUI.WindowTitle = "Restin.AI Auto-Lock Watcher"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
}

function Get-ModifiedFiles {
    # Get files that are modified (staged + unstaged)
    $staged = git diff --cached --name-only 2>$null
    $unstaged = git diff --name-only 2>$null
    $untracked = git ls-files --others --exclude-standard 2>$null
    
    $all = @()
    if ($staged) { $all += $staged }
    if ($unstaged) { $all += $unstaged }
    if ($untracked) { $all += $untracked }
    
    # Deduplicate and return just filenames
    return ($all | Sort-Object -Unique)
}

function Update-Lock {
    param([string[]]$Files)
    
    $fileList = ($Files | ForEach-Object { Split-Path $_ -Leaf }) -join ","
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $lockContent = @"
# ═══════════════════════════════════════
# 🔒 AUTO-LOCK — Files being edited
# ═══════════════════════════════════════
PC: $PCName
USER: $env:USERNAME
TIME: $timestamp
DESCRIPTION: Auto-locked (editing $($Files.Count) files)
LOCKED_FILES: $fileList
MODE: auto
"@
    $lockContent | Out-File -Encoding UTF8 $LockFile -Force
}

function Clear-Lock {
    if (Test-Path $LockFile) {
        $content = Get-Content $LockFile -Raw 2>$null
        if ($content -match "PC: $PCName" -and $content -match "MODE: auto") {
            "" | Out-File -Encoding UTF8 $LockFile -Force
            Write-Log "Lock released (no modified files)" "Green"
        }
    }
}

# === MAIN LOOP ===
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║   Restin.AI Auto-Lock Watcher  v1.0       ║" -ForegroundColor Magenta
Write-Host "  ║   Monitoring file changes every ${Interval}s       ║" -ForegroundColor Magenta
Write-Host "  ║   Press Ctrl+C to stop                    ║" -ForegroundColor Magenta
Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$lastFiles = @()

while ($true) {
    try {
        $currentFiles = Get-ModifiedFiles
        
        if ($currentFiles.Count -gt 0) {
            $newFiles = $currentFiles | Where-Object { $_ -notin $lastFiles }
            if ($newFiles.Count -gt 0 -or $lastFiles.Count -eq 0) {
                Write-Log "Editing $($currentFiles.Count) file(s): $($currentFiles[0..2] -join ', ')$(if($currentFiles.Count -gt 3){' ...'})" "Yellow"
                Update-Lock -Files $currentFiles
            }
        }
        elseif ($lastFiles.Count -gt 0) {
            # Files went from >0 to 0 — likely committed/reverted
            Clear-Lock
        }
        
        $lastFiles = $currentFiles
    }
    catch {
        Write-Log "Error: $_" "Red"
    }
    
    Start-Sleep -Seconds $Interval
}
