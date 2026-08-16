---
tags: [health, devices, monitoring, troubleshooting]
updated: 2026-08-16
---

# Device Monitoring and Troubleshooting

The device layer of the health hub: `DeviceMonitorDashboard` shows connection status, alerts, and 24-hour data quality per paired device; `TroubleshootingWizard` walks users through DB-driven repair guides and diagnostics; and a `device-troubleshooting-ai` Edge Function can generate GPT-based guidance (currently uncalled by any UI).

## Overview

The schema comes from two migrations: `supabase/migrations/20251027030000_create_device_integration_system.sql` (`device_registry`, `device_connections`, `data_quality_logs`, `realtime_data_streams`, `device_alerts`, `data_transformation_rules`, plus RPCs like `get_device_status_summary`) and `supabase/migrations/20251027040000_create_device_troubleshooting_system.sql` (guides, steps, `troubleshooting_sessions`, `device_diagnostics_log`, `troubleshooting_ai_context`, and the `get_troubleshooting_guide` / `run_device_diagnostics` / `log_troubleshooting_attempt` RPCs). A separate, older monitoring set (`connections`, `metrics_norm`, `device_health`, `alerts`) belongs to `device-webhook-handler` — see [[Webhook Ingestion Pipeline]].

## How It Works

### DeviceMonitorDashboard

Rendered on the **Devices** tab of `src/components/StRaphaelHealthHub.tsx` (the `/health-dashboard` route). Every 30 seconds it loads, in parallel:

- `device_connections` joined to `device_registry` — per-device card with battery, signal quality, error count, last-data age
- unresolved `device_alerts` (latest 10) — severity-badged, with an Acknowledge button that stamps `acknowledged_at`
- 24 h of `data_quality_logs` — aggregated client-side into per-metric average quality and anomaly counts
- the `get_device_status_summary` RPC — the six headline counters (total/active/disconnected/error/low-battery/health score)

Devices in `error` status (or with errors) get a "Troubleshoot Issues" button that opens the wizard.

### TroubleshootingWizard

`src/components/TroubleshootingWizard.tsx` is entirely RPC-driven, no AI involved: it loads guides for the device type via `get_troubleshooting_guide`, opens a `troubleshooting_sessions` row, steps the user through numbered instructions (recording outcomes via `log_troubleshooting_attempt`), and can run `run_device_diagnostics`, rendering the returned per-check results.

### device-troubleshooting-ai

An Edge Function that builds a "You are St. Raphael, an expert healthcare technology troubleshooting assistant" prompt from `{deviceType, deviceName, manufacturer, issue, userContext}` and calls OpenAI `gpt-4-turbo-preview`, logging a preview into `troubleshooting_ai_context` when a JWT is present.

> [!warning] The AI function is orphaned and loosely gated
> Verified 2026-08-16: nothing in `src/` invokes `device-troubleshooting-ai` — the wizard uses the database RPCs only. The function also performs no auth check of its own (the `Authorization` header is used solely for optional context logging), so its effective gating depends on the platform's JWT verification setting at deploy time.

### Data feeding the dashboard

- `device-stream-handler` updates `device_connections.last_data_received_at`/`connection_status`, writes `data_quality_logs` per point, and inserts `device_alerts` on validation-rule breaches ([[Glucose Monitoring and Alerts]] covers the glucose thresholds).
- `device-webhook-handler` maintains the parallel `device_health` snapshots (freshness, completeness, uptime) and `alerts` rows — but note the dashboard reads `device_alerts`, not `alerts`, so those staleness warnings have no UI surface today.
- `device-backfill` and `device-stream` are further Edge Functions in the same family; the dashboard itself talks straight to Postgres.

The dashboard's info panel claims "Critical alerts trigger automatic emergency contact notifications" — in code the emergency path only logs "would notify N contacts" (`supabase/functions/device-stream-handler/index.ts:373-383`), a gap already flagged in [[Safety Guardrails]].

Connection-health rotation (failover between providers) is a separate system with its own tab in the hub — see [[Connection Rotation]].

## Key Files

- `src/components/DeviceMonitorDashboard.tsx` — status, alerts, and quality dashboard (Devices tab)
- `src/components/TroubleshootingWizard.tsx` — RPC-driven guide/diagnostics modal
- `src/components/StRaphaelHealthHub.tsx` — the tabbed hub that mounts both
- `supabase/functions/device-troubleshooting-ai/index.ts` — GPT troubleshooting generator (no UI caller)
- `supabase/functions/device-stream-handler/index.ts` — the writer behind connection status, quality logs, and alerts
- `supabase/functions/device-webhook-handler/index.ts` — parallel `device_health`/`alerts` evaluator
- `supabase/migrations/20251027030000_create_device_integration_system.sql` — device tables and status RPCs
- `supabase/migrations/20251027040000_create_device_troubleshooting_system.sql` — troubleshooting tables and RPCs

## Related

- [[Webhook Ingestion Pipeline]] — how device data arrives and where the two alert tables diverge
- [[Glucose Monitoring and Alerts]] — the threshold rules that generate `device_alerts`
- [[Health UI Components]] — the wider health frontend this dashboard belongs to
- [[Safety Guardrails]] — the log-only emergency-contact escalation
- [[Connection Rotation]] — sibling system for provider failover health
- [[Saints Dashboard UI]] — where the health hub sits in the overall app
- [[Health Integrations MOC]] — hub for all provider notes
