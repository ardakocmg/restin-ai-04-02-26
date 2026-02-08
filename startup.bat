@echo off
setlocal

echo [INFO] Restin AI - Windows Startup Script
echo [INFO] Setting up environment...

:: Set PYTHONPATH to include the current directory so backend modules can be imported
set PYTHONPATH=%CD%

:: Check if virtual environment exists
:: Check for virtual environment in multiple locations
if exist "backend\venv\Scripts\activate.bat" (
    call backend\venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found at backend\venv or .venv
    echo [INFO] Please run the setup script first or ensure venv is created.
    pause
    exit /b 1
)



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
