@echo off
REM ============================================
REM  Restin.AI - Start All PC2 Watchers + Servers
REM  Double-click this file to launch everything
REM ============================================

cd /d "%~dp0\.."

echo [1/4] Starting Git Auto-Pull Watcher...
start "Auto-Pull" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0git-auto-pull.ps1"

echo [2/4] Starting Auto-Lock Watcher...
start "Auto-Lock" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0auto-lock.ps1"

echo [3/4] Starting Activity Status...
start "Activity-Status" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0activity-status.ps1"

echo [4/4] Starting Auto Dev Runner (Frontend + Backend)...
start "Dev-Runner" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0auto-dev-runner.ps1"

echo.
echo All 4 services started!
echo   - Auto-Pull      (syncs code from PC1)
echo   - Auto-Lock      (signals file edits)
echo   - Activity Status (broadcasts PC status)
echo   - Dev Runner      (auto-restarts servers after pulls)
echo.
echo Close this window or press any key.
pause > nul
