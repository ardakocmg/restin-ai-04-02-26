<#
.SYNOPSIS
    Domain Fence Enforcer — Blocks commits that touch files outside your PC's domain
.DESCRIPTION
    Checks staged files against the domain rules defined in dual-pc.md.
    Designed as a pre-commit guard so PC1 doesn't accidentally edit PC2's files.
.USAGE
    .\scripts\domain-fence.ps1          # Check staged files
    .\scripts\domain-fence.ps1 -Warn    # Warn only, don't block
#>

param(
    [switch]$Warn = $false
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$PCName = $env:COMPUTERNAME

# ═══════════════════════════════════════════════════════
# DOMAIN RULES — Edit these to match your dual-pc.md
# Format: PC name → array of glob patterns it OWNS
# ═══════════════════════════════════════════════════════

$DomainRules = @{
    # PC1 (MG Group) owns these exclusively
    "PC1_EXCLUSIVE"        = @(
        "frontend/src/layouts/*",
        "frontend/src/App.tsx",
        "frontend/src/routes/*",
        "*.ps1",
        ".agent/*"
    )

    # Shared domains — both PCs can edit, but needs worklock
    "SHARED_LOCK_REQUIRED" = @(
        "frontend/src/pages/**",
        "frontend/src/pages/pos/*"
    )
}

# Determine if this PC is PC1 or PC2
$IsPC1 = ($PCName -match "MG" -or $PCName -match "192.168.31.243")

function Test-PathMatchesGlob {
    param([string]$FilePath, [string]$GlobPattern)
    
    # Convert glob to regex
    $regex = $GlobPattern -replace '\.', '\.' -replace '\*\*/', '.*' -replace '\*', '[^/]*'
    return ($FilePath -match $regex)
}

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# Get staged files
$stagedFiles = @(git diff --cached --name-only 2>$null)

if ($stagedFiles.Count -eq 0) {
    Write-Log "No staged files to check" "DarkGray"
    exit 0
}

Write-Host ""
Write-Host "  🚧 Domain Fence Check" -ForegroundColor Cyan
Write-Host "  ════════════════════════════" -ForegroundColor DarkCyan
Write-Host "  PC: $PCName $(if($IsPC1){'(PC1)'}else{'(PC2)'})" -ForegroundColor DarkGray
Write-Host "  Files staged: $($stagedFiles.Count)" -ForegroundColor DarkGray
Write-Host ""

$violations = @()
$warnings = @()

foreach ($file in $stagedFiles) {
    # Check PC1 exclusive files
    if (-not $IsPC1) {
        foreach ($pattern in $DomainRules["PC1_EXCLUSIVE"]) {
            if (Test-PathMatchesGlob -FilePath $file -GlobPattern $pattern) {
                $violations += @{ file = $file; rule = "PC1_EXCLUSIVE"; pattern = $pattern }
            }
        }
    }

    # Check shared files needing worklock
    foreach ($pattern in $DomainRules["SHARED_LOCK_REQUIRED"]) {
        if (Test-PathMatchesGlob -FilePath $file -GlobPattern $pattern) {
            # Check if worklock exists for this file
            $lockFile = Join-Path $repoRoot ".worklock"
            $isLocked = $false
            if (Test-Path $lockFile) {
                $lockContent = Get-Content $lockFile -Raw 2>$null
                if ($lockContent -and $lockContent -match "PC:" -and $lockContent -notmatch "PC: $PCName") {
                    $lockedFiles = ($lockContent | Select-String "LOCKED_FILES: (.*)").Matches
                    if ($lockedFiles) {
                        $lockedList = $lockedFiles[0].Groups[1].Value -split ","
                        $fileName = Split-Path $file -Leaf
                        if ($lockedList -contains $fileName.Trim()) {
                            $isLocked = $true
                            $violations += @{ file = $file; rule = "LOCKED_BY_OTHER_PC"; pattern = $pattern }
                        }
                    }
                }
            }
            if (-not $isLocked) {
                $warnings += @{ file = $file; rule = "SHARED_NO_LOCK"; pattern = $pattern }
            }
        }
    }
}

# Report
foreach ($w in $warnings) {
    Write-Log "  ⚠️  $($w.file) — shared domain, consider locking" "Yellow"
}

foreach ($v in $violations) {
    if ($v.rule -eq "PC1_EXCLUSIVE") {
        Write-Log "  ⛔ $($v.file) — PC1 EXCLUSIVE domain! This PC cannot edit." "Red"
    }
    elseif ($v.rule -eq "LOCKED_BY_OTHER_PC") {
        Write-Log "  ⛔ $($v.file) — LOCKED by other PC!" "Red"
    }
}

if ($violations.Count -gt 0) {
    Write-Host ""
    if ($Warn) {
        Write-Log "  ⚠️  $($violations.Count) domain violation(s) detected (warn mode — not blocking)" "Yellow"
        exit 0
    }
    else {
        Write-Log "  ❌ BLOCKED: $($violations.Count) domain violation(s). Use -Warn to bypass." "Red"
        exit 1
    }
}
else {
    Write-Host ""
    Write-Log "  ✅ All $($stagedFiles.Count) files pass domain check" "Green"
    exit 0
}
