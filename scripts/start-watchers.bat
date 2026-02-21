@echo off
REM ============================================
REM  Restin.AI - Start All PC2 Watchers
REM  Double-click this file to launch all 3
REM ============================================

cd /d "%~dp0\.."

echo Starting Git Auto-Pull Watcher...
start "Auto-Pull" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0git-auto-pull.ps1"

echo Starting Auto-Lock Watcher...
start "Auto-Lock" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0auto-lock.ps1"

echo Starting Activity Status...
start "Activity-Status" powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0activity-status.ps1"

echo.
echo All 3 watchers started!
echo Close this window or press any key.
pause > nul
