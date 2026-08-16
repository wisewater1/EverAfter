---
tags: [health, moc]
updated: 2026-08-16
---

# Health Integrations MOC

Hub for the health-data half of EverAfter: provider integrations, the OAuth and webhook plumbing they share, and the monitoring/analytics layers on top. Start with [[Terra Integration]] (the primary aggregator) or [[Health OAuth Flow]] (the generic connect story); readings ultimately feed [[St Raphael]].

## Providers

- [[Terra Integration]] — primary aggregator: one widget, dozens of devices, two parallel webhook pipelines
- [[Fitbit Integration]] — direct OAuth plus a notification-driven, signature-verified webhook
- [[Dexcom CGM]] — first-party CGM: dedicated OAuth, EGV webhook, manual CSV/JSON upload
- [[Oura Integration]] — direct OAuth and a steps-only pull sync; the direct webhook is an honest 501 stub (live route is Terra)
- [[SMART on FHIR]] — clinical EHR handshake (Epic, Cerner); auth-only scaffolding, no clinical data is fetched yet

## Shared Plumbing

- [[Health OAuth Flow]] — `connect-start`/`connect-callback`, state handling, token storage in `provider_accounts`
- [[Webhook Ingestion Pipeline]] — push ingestion: signature check, dedup, normalize, insert
- [[Health Data Normalization]] — mg/dL convention, standard metric names, `ingestMetric` validation
- [[Connection Rotation]] — priority queue that re-syncs pull-based providers and health-scores connections

## Monitoring & Analytics

- [[Glucose Monitoring and Alerts]] — TIR aggregation, the <55/<70/>180 mg/dL thresholds, `glucose-aggregate-cron`
- [[Device Monitoring and Troubleshooting]] — device health dashboards and AI-assisted troubleshooting
- [[Health Insights and Analytics]] — insight generation and reporting downstream of ingested metrics

## Deeper Context

- [[Webhook Signature Verification]] — the HMAC patterns behind Terra/Fitbit/Dexcom endpoints
- [[Health UI Components]] — connector cards, dashboards, and the health hub surfaces
- [[Health Data Edge Functions]] / [[Webhook Edge Functions]] / [[OAuth Edge Functions]] — function-catalog views of the same territory
- [[PHI Handling]] — logging and privacy rules every integration must respect
- [[Key Tables]] — `provider_accounts`, `health_metrics`, `glucose_readings`, and friends

## Related

- [[Home]] — vault entry point
- [[Backend MOC]] — the edge-function layer these integrations run on
- [[Frontend MOC]] — pages and components that surface health data
- [[Database MOC]] — migrations, RLS, and the tables listed above
- [[AI Systems MOC]] — St Raphael and the AI consumers of health metrics
- [[Security MOC]] — webhook verification, RLS, and the caveats flagged in these notes
- [[Operations MOC]] — deploys, secrets, and scheduled jobs
- [[Architecture MOC]] — the system-wide picture above this area
