@echo off
REM ============================================
REM  Restin.AI - Start PC1 Watchers
REM  Double-click this file to launch watchers
REM ============================================

cd /d "%~dp0\.."

echo Starting Git Auto-Pull Watcher (syncs from PC2)...
start "Auto-Pull" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0git-auto-pull.ps1"

echo Starting Activity Status Broadcaster...
start "Activity-Status" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0activity-status.ps1"

echo.
echo PC1 watchers started! (Auto-Pull + Activity Status)
echo Close this window or press any key.
pause > nul
