---
tags: [health, normalization, units, data-model]
updated: 2026-08-16
---

# Health Data Normalization

The conventions that turn heterogeneous provider payloads into comparable rows: canonical units (glucose always mg/dL), standardized metric names, quality validation at ingest, and the untouched provider payload preserved in a `raw` jsonb column.

## Overview

Normalization happens at the edge, inside the ingestion functions, before anything is stored — there is no batch re-normalizer. Two helpers do most of the work: `toMgDl` in `supabase/functions/_shared/glucose.ts` for glucose, and `ingestMetric` in `supabase/functions/_shared/connectors.ts` for everything else flowing through the [[Webhook Ingestion Pipeline]].

## How It Works

### Canonical units

- **Glucose is always stored in mg/dL.** `toMgDl(value, unit)` converts `mmol/L × 18.0182`, rounded to 0.1 (`supabase/functions/_shared/glucose.ts:32`). `upsertGlucoseReading` writes `unit: 'mg/dL'` unconditionally; the original unit survives only inside the reading's `raw` payload. `computeTIR` and `computeGlucoseStats` also convert per-reading, so mixed-unit history cannot skew aggregates.
- Other metrics keep the provider's unit in the `unit` column (`bpm`, `ms`, `%`, `count`, `kcal`, `hours`) — there is no cross-provider unit conversion for non-glucose metrics; consistency relies on each webhook mapping to sensible units.

### Standardized metric names

The live `health_metrics` writers use these names: `steps`, `resting_hr`, `hrv` (RMSSD), `sleep_efficiency` (× 100 to %), `glucose`, plus whatever `device-stream-handler` clients send as `metricType`. The `validateMetricQuality` range table also recognizes `heart_rate`, `sleep_hours`, `weight`, `spo2`, `body_temp`.

> [!warning] Two competing naming schemes
> `supabase/functions/_shared/data-transform.ts` (the registry pipeline's mapper for `health_unified_metrics`) uses **different** names for the same concepts: `resting_heart_rate`, `sleep_duration`, `calories_burned`, `active_minutes`, `distance`. And `CLAUDE.md`'s canonical list includes `tir` and `vo2_max`, which no ingestion path writes today (TIR lives in `glucose_daily_agg` as `tir_70_180_pct`, not as a metric row). Queries that join across pipelines by metric name will silently miss data.

### Raw payload preservation

Every store keeps the provider's original data next to the normalized value:

- `health_metrics.raw` — the payload fragment the metric was derived from
- `glucose_readings.raw` — the full EGV record (trend, quality, transmitter id)
- `webhook_events.payload` — the entire webhook body, per event
- `data_transformation_rules` (seeded by `supabase/migrations/20251027032000_seed_transformation_rules.sql`) additionally carry LOINC/SNOMED codes, `unit_conversion` and `validation_rules` jsonb per provider metric

This means a future re-normalization is possible without re-fetching from providers, at the cost of PHI living in jsonb columns — see [[PHI Handling]].

### Quality validation

`ingestMetric` scores each point against clinical plausibility ranges (glucose 40–400 mg/dL, heart rate 30–220 bpm, resting HR 30–120, steps 0–100k, sleep 0–24 h, weight 20–300 kg, SpO2 70–100 %, body temp 32–43 °C). Out-of-range values are still stored, but with `quality_score: 0`, `is_anomaly: true`, an `anomaly_reason`, and a companion row in `data_quality_issues`. Consumers like `health-insights-ai` filter on `quality_score >= 0.5`, so bad points are kept for audit but excluded from analysis ([[Health Insights and Analytics]]).

## Data Model

Three parallel normalized stores exist — a consolidation candidate:

| Table | Writer | Uniqueness |
| --- | --- | --- |
| `health_metrics` | `ingestMetric` (webhooks, `sync-health-now`, `device-stream-handler`) | none — soft 5-min window dedup only |
| `health_unified_metrics` | `health-sync-processor` (currently broken) | partial unique `(user_id, provider_key, source_record_id)` |
| `metrics_norm` | `device-webhook-handler` | none |

`glucose_readings` sits beside them with a hard unique key `(user_id, engram_id, ts, src)` — see [[Glucose Monitoring and Alerts]]. All tables carry [[Row Level Security]].

## Key Files

- `supabase/functions/_shared/glucose.ts` — `toMgDl`, `upsertGlucoseReading`, `computeTIR`, `computeGlucoseStats`
- `supabase/functions/_shared/connectors.ts` — `ingestMetric`, `validateMetricQuality`, range table
- `supabase/functions/_shared/data-transform.ts` — `StandardMetric` shape and per-provider `transform*Data` mappers
- `supabase/migrations/20251025110000_create_health_connectors_system.sql` — `health_metrics` schema
- `supabase/migrations/20251027032000_seed_transformation_rules.sql` — per-provider validation and unit-conversion rules
- `supabase/migrations/20251029140000_create_device_monitoring_system.sql` — `metrics_norm`

## Related

- [[Webhook Ingestion Pipeline]] — where these conventions are applied
- [[Glucose Monitoring and Alerts]] — the mg/dL rule's main consumer
- [[Health Insights and Analytics]] — analysis layers that depend on the standard names
- [[Dexcom CGM]] — EGV-specific normalization and the manual CSV path
- [[Key Tables]] — the wider database picture these stores sit in
- [[PHI Handling]] — implications of raw payload retention
- [[Health Integrations MOC]] — hub for all provider notes
