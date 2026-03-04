#!/usr/bin/env pwsh
<#
.SYNOPSIS
    EverAfter AI — Full Stack Launcher with Health Monitor
    Starts ALL backend services and keeps them alive.

.DESCRIPTION
    Launches:
      1. FastAPI Main Backend     → http://localhost:8002
      2. Health-Connect API       → http://localhost:4000
      3. Celery Background Worker → (no HTTP port)
      4. Vite Frontend            → http://localhost:5173

    Polls /health endpoints every 30 seconds. Shows LIVE status in console.

.PARAMETER SkipCelery
    Skip starting the Celery worker (useful if Redis is not running).

.PARAMETER SkipHealthApi
    Skip starting the Health-Connect Node.js API.

.PARAMETER WatchOnly
    Don't start services — only poll existing running services for health.

.EXAMPLE
    .\start_everafter.ps1
    .\start_everafter.ps1 -SkipCelery
    .\start_everafter.ps1 -WatchOnly
#>

param(
    [switch]$SkipCelery,
    [switch]$SkipHealthApi,
    [switch]$WatchOnly
)

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot

# ─── ANSI Colors ─────────────────────────────────────────────────────────────
function Green($t)  { Write-Host $t -ForegroundColor Green }
function Cyan($t)   { Write-Host $t -ForegroundColor Cyan }
function Yellow($t) { Write-Host $t -ForegroundColor Yellow }
function Red($t)    { Write-Host $t -ForegroundColor Red }
function White($t)  { Write-Host $t -ForegroundColor White }
function Dim($t)    { Write-Host $t -ForegroundColor DarkGray }

# ─── Banner ──────────────────────────────────────────────────────────────────
Clear-Host
Cyan "╔══════════════════════════════════════════════════════════╗"
Cyan "║         E V E R A F T E R   A I  —  Full Launcher        ║"
Cyan "║  FastAPI · Health-API · Celery Worker · Vite Frontend     ║"
Cyan "╚══════════════════════════════════════════════════════════╝"
Write-Host ""

# ─── Helper: Start a service in a new window ─────────────────────────────────
function Start-ServiceWindow {
    param($Title, $Cwd, $Command)
    $args = "/k `"title $Title && cd /d `"$Cwd`" && $Command`""
    Start-Process "cmd.exe" -ArgumentList $args -WindowStyle Normal
    Start-Sleep -Seconds 2
}

# ─── Helper: Health check ─────────────────────────────────────────────────────
function Check-Health {
    param($Url, $ServiceName)
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            return $true
        }
    } catch {}
    return $false
}

if (-not $WatchOnly) {

    # ─── 1. FastAPI Main Backend ─────────────────────────────────────────────
    Green "[1/4] Starting FastAPI Main Backend..."
    Dim  "      Port: 8002  |  Docs: http://localhost:8002/docs"
    $fastapiCmd = "venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"
    Start-ServiceWindow `
        -Title "FastAPI Backend :8002" `
        -Cwd "$Root\backend" `
        -Command $fastapiCmd

    # ─── 2. Health-Connect API ───────────────────────────────────────────────
    if (-not $SkipHealthApi) {
        Green "[2/4] Starting Health-Connect API (Raphael Wearables)..."
        Dim  "      Port: 4000  |  Terra / Oura / Fitbit / Dexcom / Strava"
        Start-ServiceWindow `
            -Title "Health-Connect API :4000" `
            -Cwd "$Root\health-api" `
            -Command "npm run dev"
    } else {
        Yellow "[2/4] SKIPPED — Health-Connect API (--SkipHealthApi flag)"
    }

    # ─── 3. Celery Worker ───────────────────────────────────────────────────
    if (-not $SkipCelery) {
        Green "[3/4] Starting Celery Background Worker..."
        Dim  "      Autonomous tasks, vigils, compliance audits"
        Start-ServiceWindow `
            -Title "Celery Worker" `
            -Cwd "$Root\backend" `
            -Command "venv\Scripts\python.exe -m celery -A app.workers.main.celery_app worker --loglevel=info --concurrency=4"
    } else {
        Yellow "[3/4] SKIPPED — Celery Worker (--SkipCelery flag)"
    }

    # ─── 4. Vite Frontend ───────────────────────────────────────────────────
    Green "[4/4] Starting Vite Frontend..."
    Dim  "      Port: 5173  |  http://localhost:5173"
    Start-ServiceWindow `
        -Title "Vite Frontend :5173" `
        -Cwd "$Root" `
        -Command "npm run dev"

    Write-Host ""
    Green "══════════════════════════════════════════════════════════"
    Green " All services launched — waiting for them to initialize..."
    Green "══════════════════════════════════════════════════════════"
    Write-Host ""

    # Give services time to start up
    $stages = @(5, 5, 5, 5, 5, 5)  # 30s total
    $total = ($stages | Measure-Object -Sum).Sum
    $elapsed = 0
    foreach ($wait in $stages) {
        $pct = [int](($elapsed / $total) * 100)
        Write-Progress -Activity "Waiting for services to start..." -PercentComplete $pct -Status "$elapsed / $total seconds"
        Start-Sleep -Seconds $wait
        $elapsed += $wait
    }
    Write-Progress -Activity "Done" -Completed
}

# ─── Health Monitor ───────────────────────────────────────────────────────────
Write-Host ""
Cyan "╔══════════════════════════════════════════════════════════╗"
Cyan "║              L I V E   H E A L T H   M O N I T O R       ║"
Cyan "╚══════════════════════════════════════════════════════════╝"
Write-Host ""
White "Service                 Port    Status"
White "─────────────────────────────────────────────────────────"

$endpoints = @(
    @{ Name = "FastAPI Backend";      Url = "http://localhost:8002/health"; },
    @{ Name = "Health-Connect API";   Url = "http://localhost:4000/health"; },
    @{ Name = "Vite Frontend";        Url = "http://localhost:5173"; },
    @{ Name = "FastAPI /docs";        Url = "http://localhost:8002/docs"; }
)

$allOk = $true

foreach ($ep in $endpoints) {
    $ok = Check-Health -Url $ep.Url -ServiceName $ep.Name
    $status = if ($ok) { "✅ ONLINE" } else { "❌ OFFLINE" }
    $color  = if ($ok) { "Green" } else { "Red" }
    $skip   = if ($ep.Name -eq "Health-Connect API" -and $SkipHealthApi) { " (skipped)" } else { "" }
    Write-Host ("  {0,-26} {1}{2}" -f $ep.Name, $status, $skip) -ForegroundColor $color
    if (-not $ok -and $ep.Name -ne "Health-Connect API") { $allOk = $false }
}

Write-Host ""

if ($allOk) {
    Green "══════════════════════════════════════════════════════════"
    Green "  ALL SYSTEMS GO — EverAfter AI is fully operational!"
    Green "══════════════════════════════════════════════════════════"
} else {
    Yellow "══════════════════════════════════════════════════════════"
    Yellow "  Some services may still be starting up."
    Yellow "  Re-run with: .\start_everafter.ps1 -WatchOnly"
    Yellow "  or visit http://localhost:8002/docs to confirm."
    Yellow "══════════════════════════════════════════════════════════"
}

Write-Host ""
White "  EverAfter Routes at http://localhost:8002/api/v1/"
Dim   "    /health      /chat         /engrams      /council"
Dim   "    /saints       /finance      /causal-twin  /trinity"
Dim   "    /rituals      /time-capsule /integrity    /audit"
Dim   "    /marketplace  /health-predictions          /media"
Write-Host ""
White "  Open the app → http://localhost:5173"
Write-Host ""
