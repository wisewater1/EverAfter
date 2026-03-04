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

REM ─── 1. FastAPI Main Backend (port 8002) ────────────────────────────────────
echo  [1/4] FastAPI Backend        → http://localhost:8002
echo         Docs                  → http://localhost:8002/docs
echo.
start "EverAfter — FastAPI Backend (8002)" cmd /k "^
  color 0B && ^
  title FastAPI Backend :8002 && ^
  cd /d "%ROOT%backend" && ^
  echo. && ^
  echo  ▶ FastAPI Backend starting on port 8002... && ^
  echo  ▶ API docs: http://localhost:8002/docs && ^
  echo. && ^
  venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"

timeout /t 2 /nobreak >nul

REM ─── 2. Health Connect API (port 4000) ──────────────────────────────────────
echo  [2/4] Health-Connect API     → http://localhost:4000
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
echo  [3/4] Celery Background Worker (autonomous tasks)
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

REM ─── 4. Vite Frontend (port 5173) ────────────────────────────────────────────
echo  [4/4] Vite Frontend          → http://localhost:5173
echo.
start "EverAfter — Vite Frontend (5173)" cmd /k "^
  color 0A && ^
  title Vite Frontend :5173 && ^
  cd /d "%ROOT%" && ^
  echo. && ^
  echo  ▶ Vite Frontend starting on port 5173... && ^
  echo. && ^
  npm run dev"

echo.
echo  ============================================================
echo   ALL SERVICES LAUNCHING IN SEPARATE WINDOWS
echo  ============================================================
echo.
echo   Service            Port     URL
echo   ─────────────────────────────────────────────────
echo   FastAPI Backend    8002     http://localhost:8002
echo   FastAPI API Docs   8002     http://localhost:8002/docs
echo   Health-Connect     4000     http://localhost:4000
echo   Vite Frontend      5173     http://localhost:5173
echo.
echo   Saints Backends via FastAPI:
echo   ✓ St. Raphael (Health)        /api/v1/health
echo   ✓ St. Joseph  (Family)        /api/v1/family
echo   ✓ St. Gabriel (Finance)       /api/v1/finance
echo   ✓ St. Michael (Security)      /api/v1/saints
echo   ✓ St. Anthony (Audit)         /api/v1/audit
echo   ✓ Trinity Synapse             /api/v1/trinity
echo   ✓ Causal Twin                 /api/v1/causal-twin
echo   ✓ Engrams                     /api/v1/engrams
echo   ✓ Chat                        /api/v1/chat
echo   ✓ Council                     /api/v1/council
echo   ✓ Rituals                     /api/v1/rituals
echo   ✓ Time Capsule                /api/v1/time-capsule
echo   ✓ Marketplace                 /api/v1/marketplace
echo   ✓ Integrity                   /api/v1/integrity
echo.
echo   Press any key to close this launcher window.
echo   (All services will continue running in their own windows)
echo.
pause >nul
