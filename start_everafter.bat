@echo off
setlocal
echo ====================================================
echo      EverAfter Local Development Environment
echo ====================================================
echo.

:: Get the directory where this script is located
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo [1/3] Starting Vite Frontend Server...
start "EverAfter Frontend (Vite)" cmd /c "npm run dev"

echo [2/3] Starting FastAPI Backend Server...
cd /d "%APP_DIR%\backend"
start "EverAfter Backend (FastAPI)" cmd /c "venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo [3/3] Starting Background Worker...
cd /d "%APP_DIR%\backend"
start "EverAfter Worker (Celery)" cmd /c "venv\Scripts\python.exe -m celery -A app.workers.main.celery_app worker --loglevel=info"

echo.
echo All services have been started in separate windows!
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8001
echo.
echo Press any key to exit this launcher (the servers will keep running in their own windows).
pause > nul
