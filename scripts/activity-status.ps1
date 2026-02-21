<#
.SYNOPSIS
    Activity Status Broadcaster — Shows what this PC is doing in real-time
.DESCRIPTION
    Writes a JSON status file that the other PC can read to see:
    - Which files are open/modified
    - Current git branch
    - Last action taken
    - Whether dev servers are running
.USAGE
    .\scripts\activity-status.ps1             # Watch mode (poll every 15s)
    .\scripts\activity-status.ps1 -Interval 5 # Poll every 5s
#>

param(
    [int]$Interval = 15
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$PCName = $env:COMPUTERNAME.ToLower()
$StatusFile = Join-Path $repoRoot ".agent" "status-$PCName.json"

# Ensure .agent dir exists
$agentDir = Join-Path $repoRoot ".agent"
if (-not (Test-Path $agentDir)) { New-Item -ItemType Directory -Path $agentDir -Force | Out-Null }

$host.UI.RawUI.WindowTitle = "Restin.AI Activity Status ($PCName)"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] " -NoNewline -ForegroundColor DarkGray
    Write-Host $Message -ForegroundColor $Color
}

function Test-PortOpen {
    param([int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync("127.0.0.1", $Port).Wait(500) | Out-Null
        $result = $tcp.Connected
        $tcp.Close()
        return $result
    }
    catch { return $false }
}

function Get-ActivityStatus {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    $lastCommit = git log -1 --format="%s (%ar)" 2>$null
    $modified = @(git diff --name-only 2>$null)
    $staged = @(git diff --cached --name-only 2>$null)
    $ahead = 0
    $behindAhead = git rev-list --left-right --count "HEAD...origin/main" 2>$null
    if ($behindAhead) {
        $parts = $behindAhead -split '\s+'
        if ($parts.Count -ge 1) { $ahead = [int]$parts[0] }
    }

    $frontendRunning = Test-PortOpen 3000
    $backendRunning = Test-PortOpen 8000

    return [PSCustomObject]@{
        pc              = $PCName
        user            = $env:USERNAME
        timestamp       = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        branch          = $branch
        lastCommit      = $lastCommit
        unpushedCommits = $ahead
        modifiedFiles   = $modified
        stagedFiles     = $staged
        totalChanges    = $modified.Count + $staged.Count
        servers         = @{
            frontend = if ($frontendRunning) { "running (:3000)" } else { "stopped" }
            backend  = if ($backendRunning) { "running (:8000)" } else { "stopped" }
        }
        uptime          = [Math]::Round((New-TimeSpan -Start (Get-Process -Id $PID).StartTime).TotalMinutes, 1)
    }
}

# Also read the other PC's status if available
function Show-OtherPC {
    $otherFiles = Get-ChildItem (Join-Path $repoRoot ".agent") -Filter "status-*.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "status-$PCName.json" }

    foreach ($f in $otherFiles) {
        try {
            $data = Get-Content $f.FullName -Raw | ConvertFrom-Json
            $age = [Math]::Round((New-TimeSpan -Start ([datetime]$data.timestamp)).TotalMinutes, 1)
            $icon = if ($age -lt 2) { "🟢" } elseif ($age -lt 10) { "🟡" } else { "🔴" }
            Write-Host "  $icon $($data.pc.ToUpper()): $($data.totalChanges) changes, branch=$($data.branch), last seen ${age}m ago" -ForegroundColor $(if ($age -lt 2) { "Green" }elseif ($age -lt 10) { "Yellow" }else { "DarkGray" })
        }
        catch {}
    }
}

# === MAIN LOOP ===
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   Restin.AI Activity Status  v1.0         ║" -ForegroundColor Green
Write-Host "  ║   Broadcasting every ${Interval}s                 ║" -ForegroundColor Green
Write-Host "  ║   Press Ctrl+C to stop                    ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

while ($true) {
    try {
        $status = Get-ActivityStatus
        $status | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 $StatusFile -Force

        Write-Log "$($PCName.ToUpper()): branch=$($status.branch), $($status.totalChanges) changes, FE=$(if($status.servers.frontend -match 'running'){'✅'}else{'❌'}) BE=$(if($status.servers.backend -match 'running'){'✅'}else{'❌'})" "Cyan"

        # Show other PC status
        Show-OtherPC
    }
    catch {
        Write-Log "Error: $_" "Red"
    }

    Start-Sleep -Seconds $Interval
}
