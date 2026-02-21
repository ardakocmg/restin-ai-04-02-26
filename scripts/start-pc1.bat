@echo off
REM ============================================
REM  Restin.AI - Start PC1 Watchers + Servers
REM  Double-click this file to launch everything
REM ============================================

cd /d "%~dp0\.."

echo [1/3] Starting Git Auto-Pull Watcher (syncs from PC2)...
start "Auto-Pull" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0git-auto-pull.ps1"

echo [2/3] Starting Activity Status Broadcaster...
start "Activity-Status" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0activity-status.ps1"

echo [3/3] Starting Auto Dev Runner (Frontend + Backend)...
start "Dev-Runner" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0auto-dev-runner.ps1"

echo.
echo PC1 services started!
echo   - Auto-Pull      (syncs code from PC2)
echo   - Activity Status (broadcasts PC status)
echo   - Dev Runner      (auto-restarts servers after pulls)
echo.
echo Close this window or press any key.
pause > nul
