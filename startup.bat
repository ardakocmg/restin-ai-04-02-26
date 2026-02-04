@echo off
setlocal

echo [INFO] Restin AI - Windows Startup Script
echo [INFO] Setting up environment...

:: Set PYTHONPATH to include the current directory so backend modules can be imported
set PYTHONPATH=%CD%

:: Check if virtual environment exists
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found at backend\venv
    echo [INFO] Please run the setup script first or ensure venv is created.
    pause
    exit /b 1
)

:: Activate Virtual Environment
call backend\venv\Scripts\activate.bat

echo [INFO] Starting backend server...
echo [SUCCESS] Once started, access the app at: http://localhost:8000
python backend/server.py

:: If the server crashes, keep the window open to see the error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    pause
)

endlocal
