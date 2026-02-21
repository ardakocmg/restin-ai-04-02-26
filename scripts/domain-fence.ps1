<#
.SYNOPSIS
    Domain Fence Enforcer -- Blocks commits that touch files outside your PC domain
.DESCRIPTION
    Checks staged files against the domain rules defined in dual-pc.md.
    Designed as a pre-commit guard so PC1 does not accidentally edit PC2 files.
.USAGE
    .\scripts\domain-fence.ps1          # Check staged files
    .\scripts\domain-fence.ps1 -Warn    # Warn only, do not block
#>

param(
    [switch]$Warn = $false
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$PCName = $env:COMPUTERNAME

$DomainRules = @{
    "PC1_EXCLUSIVE"        = @(
        "frontend/src/layouts/*",
        "frontend/src/App.tsx",
        "frontend/src/routes/*",
        "*.ps1",
        ".agent/*"
    )
    "SHARED_LOCK_REQUIRED" = @(
        "frontend/src/pages/**",
        "frontend/src/pages/pos/*"
    )
}

$IsPC1 = ($PCName -match "MG" -or $PCName -match "192.168.31.243")

function Test-PathMatchesGlob {
    param([string]$FilePath, [string]$GlobPattern)
    $regex = $GlobPattern -replace '\.', '\.' -replace '\*\*/', '.*' -replace '\*', '[^/]*'
    return ($FilePath -match $regex)
}

# Get staged files
$stagedFiles = @(git diff --cached --name-only 2>$null)

if ($stagedFiles.Count -eq 0) {
    Write-Host "No staged files to check" -ForegroundColor DarkGray
    exit 0
}

Write-Host ""
Write-Host "  DOMAIN FENCE CHECK" -ForegroundColor Cyan
Write-Host "  ============================" -ForegroundColor DarkCyan
Write-Host "  PC: $PCName $(if($IsPC1){'(PC1)'}else{'(PC2)'})" -ForegroundColor DarkGray
Write-Host "  Files staged: $($stagedFiles.Count)" -ForegroundColor DarkGray
Write-Host ""

$violations = @()
$warnings = @()

foreach ($file in $stagedFiles) {
    if (-not $IsPC1) {
        foreach ($pattern in $DomainRules["PC1_EXCLUSIVE"]) {
            if (Test-PathMatchesGlob -FilePath $file -GlobPattern $pattern) {
                $violations += @{ file = $file; rule = "PC1_EXCLUSIVE"; pattern = $pattern }
            }
        }
    }

    foreach ($pattern in $DomainRules["SHARED_LOCK_REQUIRED"]) {
        if (Test-PathMatchesGlob -FilePath $file -GlobPattern $pattern) {
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

foreach ($w in $warnings) {
    Write-Host "  [WARN] $($w.file) -- shared domain, consider locking" -ForegroundColor Yellow
}

foreach ($v in $violations) {
    if ($v.rule -eq "PC1_EXCLUSIVE") {
        Write-Host "  [BLOCK] $($v.file) -- PC1 EXCLUSIVE domain! This PC cannot edit." -ForegroundColor Red
    }
    elseif ($v.rule -eq "LOCKED_BY_OTHER_PC") {
        Write-Host "  [BLOCK] $($v.file) -- LOCKED by other PC!" -ForegroundColor Red
    }
}

if ($violations.Count -gt 0) {
    Write-Host ""
    if ($Warn) {
        Write-Host "  [WARN] $($violations.Count) domain violation(s) detected (warn mode -- not blocking)" -ForegroundColor Yellow
        exit 0
    }
    else {
        Write-Host "  [BLOCKED] $($violations.Count) domain violation(s). Use -Warn to bypass." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host ""
    Write-Host "  [OK] All $($stagedFiles.Count) files pass domain check" -ForegroundColor Green
    exit 0
}
