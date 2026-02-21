<#
.SYNOPSIS
    Post-Pull Health Check — Runs after auto-pull to verify build integrity
.DESCRIPTION
    Called by git-auto-pull.ps1 after a successful pull. Runs TypeScript
    compilation check and writes results to .agent/build-status-{pc}.json.
    The other PC can read this to know if its push broke anything.
.USAGE
    .\scripts\health-check-post-pull.ps1
#>

$repoRoot = Split-Path -Parent $PSScriptRoot
$PCName = $env:COMPUTERNAME.ToLower()
$StatusFile = Join-Path $repoRoot ".agent" "build-status-$PCName.json"
$FrontendDir = Join-Path $repoRoot "frontend"

$host.UI.RawUI.WindowTitle = "Restin.AI Health Check"

# Ensure .agent dir exists
$agentDir = Join-Path $repoRoot ".agent"
if (-not (Test-Path $agentDir)) { New-Item -ItemType Directory -Path $agentDir -Force | Out-Null }

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
}

function Save-Status {
    param([string]$Check, [string]$Result, [string]$Details, [object]$Existing)
    
    if (-not $Existing) { $Existing = @{} }
    $Existing | Add-Member -NotePropertyName $Check -NotePropertyValue @{
        status  = $Result
        details = $Details
        time    = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    } -Force
    
    $Existing | Add-Member -NotePropertyName "pc" -NotePropertyValue $PCName -Force
    $Existing | Add-Member -NotePropertyName "lastRun" -NotePropertyValue (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Force
    
    $Existing | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 $StatusFile -Force
    return $Existing
}

Write-Host ""
Write-Host "  🏥 Post-Pull Health Check" -ForegroundColor Cyan
Write-Host "  ════════════════════════════" -ForegroundColor DarkCyan
Write-Host ""

$status = [PSCustomObject]@{}

# 1. TypeScript Check
Write-Log "Running TypeScript check..." "Cyan"
$tscOutput = ""
$tscExitCode = 0
try {
    Set-Location $FrontendDir
    $tscOutput = npx tsc --noEmit 2>&1 | Out-String
    $tscExitCode = $LASTEXITCODE
}
catch {
    $tscOutput = "Failed to run tsc: $_"
    $tscExitCode = 1
}

if ($tscExitCode -eq 0) {
    Write-Log "TypeScript: ✅ PASS" "Green"
    $status = Save-Status -Check "typescript" -Result "pass" -Details "No errors" -Existing $status
}
else {
    $errorCount = ($tscOutput | Select-String "error TS" | Measure-Object).Count
    Write-Log "TypeScript: ❌ FAIL ($errorCount errors)" "Red"
    # Truncate output for JSON
    $truncated = ($tscOutput -split "`n" | Select-Object -First 10) -join "; "
    $status = Save-Status -Check "typescript" -Result "fail" -Details "$errorCount errors. First: $truncated" -Existing $status
}

# 2. Lint Check (quick)
Write-Log "Running quick lint check..." "Cyan"
$lintOutput = ""
try {
    $lintOutput = npx eslint src/App.tsx --max-warnings 999 2>&1 | Out-String
    $lintResult = if ($LASTEXITCODE -eq 0) { "pass" } else { "warn" }
}
catch {
    $lintResult = "skip"
    $lintOutput = "Skipped"
}
Write-Log "Lint: $(if($lintResult -eq 'pass'){'✅ PASS'}elseif($lintResult -eq 'warn'){'⚠️ WARNINGS'}else{'⏭ SKIPPED'})" $(if ($lintResult -eq 'pass') { "Green" }elseif ($lintResult -eq 'warn') { "Yellow" }else { "DarkGray" })
$status = Save-Status -Check "lint" -Result $lintResult -Details ($lintOutput.Substring(0, [Math]::Min(200, $lintOutput.Length))) -Existing $status

# 3. Package integrity
Write-Log "Checking package integrity..." "Cyan"
$lockFile = Join-Path $FrontendDir "package-lock.json"
$nodeModules = Join-Path $FrontendDir "node_modules"
$pkgOk = (Test-Path $lockFile) -and (Test-Path $nodeModules)
if ($pkgOk) {
    Write-Log "Packages: ✅ OK" "Green"
    $status = Save-Status -Check "packages" -Result "pass" -Details "node_modules and lock file present" -Existing $status
}
else {
    Write-Log "Packages: ⚠️ Missing — run npm install" "Yellow"
    $status = Save-Status -Check "packages" -Result "warn" -Details "node_modules or lock file missing" -Existing $status
}

# 4. Overall status
$overall = if (($status.typescript.status -eq "fail")) { "unhealthy" } else { "healthy" }
$status | Add-Member -NotePropertyName "overall" -NotePropertyValue $overall -Force

Write-Host ""
$overallIcon = if ($overall -eq "healthy") { "🟢" } else { "🔴" }
Write-Log "Overall: $overallIcon $($overall.ToUpper())" $(if ($overall -eq "healthy") { "Green" }else { "Red" })
Write-Host ""

# Push the status file
Set-Location $repoRoot
git add $StatusFile 2>$null
git commit -m "health: $PCName post-pull check — $overall" --no-verify 2>$null | Out-Null
git push origin main 2>$null | Out-Null
