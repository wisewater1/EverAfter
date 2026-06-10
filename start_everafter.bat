@echo off
setlocal EnableDelayedExpansion
title EverAfter — Full Stack Launcher
color 0A

echo.
echo  ████████╗██████╗ ██╗███╗   ██╗██╗████████╗██╗   ██╗
echo  ██╔════╝██╔═══██╗██║████╗  ██║██║╚══██╔══╝╚██╗ ██╔╝
echo  █████╗  ██║   ██║██║██╔██╗ ██║██║   ██║    ╚████╔╝
echo  ██╔══╝  ██║   ██║██║██║╚██╗██║██║   ██║     ╚██╔╝
echo  ███████╗╚██████╔╝██║██║ ╚████║██║   ██║      ██║
echo  ╚══════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝      ╚═╝
echo             E V E R A F T E R   A I
echo.
echo  Starting ALL services...
echo  ============================================================
echo.

set "ROOT=%~dp0"

REM ─── 1. FastAPI Main Backend (port 8010) ────────────────────────────────────
echo  [1/7] FastAPI Backend        → http://localhost:8010
echo         Docs                  → http://localhost:8010/docs
echo.
start "EverAfter — FastAPI Backend (8010)" cmd /k "^
  color 0B && ^
  title FastAPI Backend :8010 && ^
  cd /d "%ROOT%backend" && ^
  echo. && ^
  echo  ▶ FastAPI Backend starting on port 8010... && ^
  echo  ▶ API docs: http://localhost:8010/docs && ^
  echo. && ^
  venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload"

timeout /t 2 /nobreak >nul

REM ─── 2. Health Connect API (port 4000) ──────────────────────────────────────
echo  [2/7] Health-Connect API     → http://localhost:4000
echo         (Terra / Oura / Fitbit / Dexcom integrations)
echo.
start "EverAfter — Health-Connect API (4000)" cmd /k "^
  color 0D && ^
  title Health-Connect API :4000 && ^
  cd /d "%ROOT%health-api" && ^
  echo. && ^
  echo  ▶ Raphael Health-Connect API starting on port 4000... && ^
  echo. && ^
  npm run dev"

timeout /t 2 /nobreak >nul

REM ─── 3. Celery Worker ───────────────────────────────────────────────────────
echo  [3/7] Celery Background Worker (autonomous tasks)
echo.
start "EverAfter — Celery Worker" cmd /k "^
  color 0E && ^
  title Celery Worker && ^
  cd /d "%ROOT%backend" && ^
  echo. && ^
  echo  ▶ Celery Worker starting... && ^
  echo. && ^
  venv\Scripts\python.exe -m celery -A app.workers.main.celery_app worker --loglevel=info --concurrency=4"

timeout /t 2 /nobreak >nul

REM ─── 4. Root Node Server (port 3001) ────────────────────────────────────────
echo  [4/7] Root Node Server       → http://localhost:3001
echo.
start "EverAfter — Root Node Server (3001)" cmd /k "^
  color 0C && ^
  title Root Node Server :3001 && ^
  cd /d "%ROOT%" && ^
  echo. && ^
  echo  ▶ Root Node Server (Saint AI Backend) starting on port 3001... && ^
  echo. && ^
  npm run dev:server"

timeout /t 2 /nobreak >nul

REM ─── 5. Root Agent Scheduler ────────────────────────────────────────────────
echo  [5/7] Root Agent Scheduler
echo.
start "EverAfter — Root Agent Scheduler" cmd /k "^
  color 09 && ^
  title Root Agent Scheduler && ^
  cd /d "%ROOT%" && ^
  echo. && ^
  echo  ▶ Root Agent Scheduler (Saint AI worker) starting... && ^
  echo. && ^
  npm run dev:worker"

timeout /t 2 /nobreak >nul

REM ─── 6. Python Task Worker ──────────────────────────────────────────────────
echo  [6/7] Python Task Worker
echo.
start "EverAfter — Python Task Worker" cmd /k "^
  color 06 && ^
  title Python Task Worker && ^
  cd /d "%ROOT%backend" && ^
  echo. && ^
  echo  ▶ Python Task Worker (Saint AI Background) starting... && ^
  echo. && ^
  venv\Scripts\python.exe -m app.workers.task_worker"

timeout /t 2 /nobreak >nul

REM ─── 7. Vite Frontend (port 5000) ────────────────────────────────────────────
echo  [7/7] Vite Frontend          → http://localhost:5000
echo.
start "EverAfter — Vite Frontend (5000)" cmd /k "^
  color 0A && ^
  title Vite Frontend :5000 && ^
  cd /d "%ROOT%" && ^
  echo. && ^
  echo  ▶ Vite Frontend starting on port 5000... && ^
  echo. && ^
  npm run dev"

echo.
echo  ============================================================
echo   ALL SERVICES LAUNCHING IN SEPARATE WINDOWS
echo  ============================================================
echo.
echo   Service            Port     URL
echo   ─────────────────────────────────────────────────
echo   FastAPI Backend    8010     http://localhost:8010
echo   Health-Connect     4000     http://localhost:4000
echo   Root Node Server   3001     http://localhost:3001
echo   Vite Frontend      5000     http://localhost:5000
echo.
echo   Background Workers:
echo   ✓ Celery Worker
echo   ✓ Root Agent Scheduler
echo   ✓ Python Task Worker
echo.
echo   Press any key to close this launcher window.
echo   (All services will continue running in their own windows)
echo.
pause >nul
