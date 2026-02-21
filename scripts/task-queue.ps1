<#
.SYNOPSIS
    Shared Task Queue — Send tasks between PC1 and PC2
.DESCRIPTION
    A lightweight task assignment system. One PC can add a task for the other,
    and the git-auto-pull watcher on the receiving PC will display it.
.USAGE
    .\scripts\task-queue.ps1 add "Fix ModifierModalNew.tsx TS errors" -Priority high -To PC2
    .\scripts\task-queue.ps1 list
    .\scripts\task-queue.ps1 done <task-id>
    .\scripts\task-queue.ps1 clear
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("add", "list", "done", "clear")]
    [string]$Action = "list",

    [Parameter(Position = 1)]
    [string]$TaskText = "",

    [string]$Priority = "normal",
    [string]$To = "",
    [string]$Id = ""
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$QueueFile = Join-Path $repoRoot ".agent" "task-queue.json"
$PCName = $env:COMPUTERNAME

# Ensure .agent dir exists
$agentDir = Join-Path $repoRoot ".agent"
if (-not (Test-Path $agentDir)) { New-Item -ItemType Directory -Path $agentDir -Force | Out-Null }

function Get-Queue {
    if (Test-Path $QueueFile) {
        $raw = Get-Content $QueueFile -Raw -ErrorAction SilentlyContinue
        if ($raw) {
            return ($raw | ConvertFrom-Json)
        }
    }
    return @()
}

function Save-Queue {
    param($Tasks)
    $Tasks | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 $QueueFile -Force
}

function Show-Tasks {
    param($Tasks)
    if ($Tasks.Count -eq 0) {
        Write-Host "📭 No tasks in queue" -ForegroundColor Green
        return
    }

    Write-Host ""
    Write-Host "  📋 SHARED TASK QUEUE ($($Tasks.Count) tasks)" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════" -ForegroundColor DarkCyan
    
    foreach ($t in $Tasks) {
        $icon = switch ($t.priority) {
            "high" { "🔴" }
            "medium" { "🟡" }
            default { "🟢" }
        }
        $statusIcon = if ($t.status -eq "done") { "✅" } else { "⬜" }
        $assignee = if ($t.to) { " → $($t.to)" } else { "" }
        
        Write-Host "  $statusIcon $icon [$($t.id)] $($t.task)$assignee" -ForegroundColor $(if ($t.status -eq "done") { "DarkGray" } else { "White" })
        Write-Host "       From: $($t.from) | $($t.created)" -ForegroundColor DarkGray
    }
    Write-Host ""
}

switch ($Action) {
    "add" {
        if ([string]::IsNullOrWhiteSpace($TaskText)) {
            Write-Host "Usage: .\task-queue.ps1 add 'Task description' -Priority high -To PC2" -ForegroundColor Yellow
            exit 1
        }
        
        $tasks = @(Get-Queue)
        $newTask = @{
            id       = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
            task     = $TaskText
            from     = $PCName
            to       = if ($To) { $To } else { "" }
            priority = $Priority.ToLower()
            status   = "pending"
            created  = (Get-Date -Format "yyyy-MM-dd HH:mm")
        }
        $tasks += $newTask
        Save-Queue -Tasks $tasks

        # Auto-push so the other PC sees it
        Set-Location $repoRoot
        git add $QueueFile 2>$null
        git commit -m "task-queue: $PCName added task '$TaskText'" --no-verify 2>$null | Out-Null
        git push origin main 2>$null | Out-Null

        Write-Host "✅ Task added: [$($newTask.id)] $TaskText" -ForegroundColor Green
        if ($To) { Write-Host "   Assigned to: $To" -ForegroundColor Cyan }
        [console]::beep(600, 100)
        [console]::beep(800, 100)
    }

    "list" {
        # Fetch latest
        Set-Location $repoRoot
        git fetch origin 2>$null | Out-Null
        if (Test-Path $QueueFile) {
            git checkout origin/main -- $QueueFile 2>$null | Out-Null
        }
        $tasks = @(Get-Queue)
        
        # Show tasks relevant to this PC
        $myTasks = @($tasks | Where-Object { $_.to -eq "" -or $_.to -eq $PCName -or $_.from -eq $PCName })
        Show-Tasks $myTasks
    }

    "done" {
        $taskId = if ($Id) { $Id } else { $TaskText }
        if ([string]::IsNullOrWhiteSpace($taskId)) {
            Write-Host "Usage: .\task-queue.ps1 done <task-id>" -ForegroundColor Yellow
            exit 1
        }
        
        $tasks = @(Get-Queue)
        $found = $false
        for ($i = 0; $i -lt $tasks.Count; $i++) {
            if ($tasks[$i].id -eq $taskId) {
                $tasks[$i].status = "done"
                $tasks[$i] | Add-Member -NotePropertyName "completedBy" -NotePropertyValue $PCName -Force
                $tasks[$i] | Add-Member -NotePropertyName "completedAt" -NotePropertyValue (Get-Date -Format "yyyy-MM-dd HH:mm") -Force
                $found = $true
            }
        }
        
        if ($found) {
            Save-Queue -Tasks $tasks
            Set-Location $repoRoot
            git add $QueueFile 2>$null
            git commit -m "task-queue: $PCName completed task $taskId" --no-verify 2>$null | Out-Null
            git push origin main 2>$null | Out-Null
            Write-Host "✅ Task $taskId marked as done" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Task $taskId not found" -ForegroundColor Red
        }
    }

    "clear" {
        $tasks = @(Get-Queue) | Where-Object { $_.status -ne "done" }
        Save-Queue -Tasks $tasks
        Set-Location $repoRoot
        git add $QueueFile 2>$null
        git commit -m "task-queue: cleared completed tasks" --no-verify 2>$null | Out-Null
        git push origin main 2>$null | Out-Null
        Write-Host "🧹 Cleared completed tasks" -ForegroundColor Green
    }
}
