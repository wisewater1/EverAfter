---
tags: [ai-systems, saints, personas, dashboards]
updated: 2026-07-02
---

# The Saints

EverAfter packages its AI features as "Saints" — named personas that each own a life domain and get a dedicated dashboard. Beyond [[St Raphael]] (health), the code ships St. Michael (security), St. Gabriel (finance/communication), St. Joseph (family/logistics), and St. Anthony (memory/audit).

## Overview

| Saint | Domain | Dashboard component | Route |
|---|---|---|---|
| Michael | Defense & Security | `src/components/StMichaelSecurityDashboard.tsx` | `/security-dashboard` (`/michael-dashboard` redirects) |
| Gabriel | Communication & Finance | `src/components/gabriel/StGabrielFinanceDashboard.tsx` | `/finance-dashboard` |
| Joseph | Family & Logistics | `src/components/StJosephFamilyDashboard.tsx` | `/family-dashboard` |
| Anthony | Memory & Discovery (audit) | `src/components/anthony/StAnthonyAuditDashboard.tsx` | `/anthony-dashboard` |
| Raphael | Health & Healing | see [[St Raphael]] | `/health-dashboard` |

The roster and role strings are hardcoded in `src/components/saints/CouncilRoom.tsx:19-70` and `src/components/council/CouncilOracle.tsx:22-28`. The main entry point that ties them together is covered in [[Saints Dashboard UI]]; the cross-saint fusion layer is [[Trinity and Council]].

## How It Works

### St. Michael — security

`StMichaelSecurityDashboard` is a tabbed shell (overview / threats / CVEs / file integrity / compliance / saints network / health alerts / chat). It pulls integrity reports, audit history, and monitoring status through `src/lib/michael/security.ts`, runs "CAI audits" (integrity score, adversarial flags, PHI-leak counts), and derives a threat level (LOW / ELEVATED / HIGH) from alert severity. Sub-panels live in `src/components/michael/`: `ThreatDetection`, `VulnerabilityScanner`, `FileIntegrityMonitor`, `CompliancePanel`, `GuardianLog`, and `DHTAnomalyAlertChain` (health-trajectory anomalies escalated to Michael).

### St. Gabriel — finance

`StGabrielFinanceDashboard` has four views: budget envelopes, transaction ledger, reports, and a "WiseGold / Sovereign Economy" panel. Bank data comes from `src/lib/gabriel/finance.ts` (with cached status/transactions for offline render) and Plaid Link via `src/lib/gabriel/plaidLink.ts`; features are gated by `src/lib/runtime-readiness.ts` capabilities (`gabriel.finance`, `gabriel.plaid`). It embeds `CouncilChat`, `GabrielDHTSummary`, and a `TrinitySynapsePanel`.

### St. Joseph — family

`StJosephFamilyDashboard` is the largest shell (16 tabs): family tree, members grid, personality quiz, media intelligence, predictions, [[Custom Engrams]] creation, Delphi health trajectory, society feed, timeline, tasks, shopping, calendar, GEDCOM genealogy (`GedcomImportExport`, `GeneWebTools`), a personality Training Lab, and chat. Genealogy is a local store (`src/lib/joseph/genealogy.ts`) hydrated in the background; core bootstrap calls race a 9s timeout and drop into an explicit "recovery mode" banner with cached/local data when the backend fails (`StJosephFamilyDashboard.tsx:78-129`). Joseph also hosts `CouncilAlerts` (see [[Trinity and Council]]) and voice-profile components (`JosephVoiceProfileCard`, `JosephVoiceAnswerPanel`, `useAudioRecorder`).

### Shared plumbing

- `src/components/SaintChat.tsx` — one chat UI reused by every saint. It bootstraps a saint session, loads history and per-saint knowledge via `apiClient` (`/api/v1/saints/{id}/bootstrap|chat|history|knowledge`), and can fall back to an on-device WebGPU LLM (`src/lib/llm/onDeviceLLM.ts`) or demo-mode canned replies.
- `src/lib/saintBridge.ts` — the "Divine Protocol (SEP)" event bus: typed `SaintEventEnvelope`s broadcast over a `BroadcastChannel` for cross-tab sync, with a deduplicated localStorage event log capped at 100 entries. Dashboards emit and subscribe to saint events (e.g. Michael reacting to scan results).
- `src/components/saints/` — cross-saint widgets: `CouncilRoom` (five-member deliberation UI), `MissionBoard` (active missions from `/api/v1/saints/missions/active`), `SaintsGuardian` (polls `/api/v1/monitoring/status` every 30s for michael/gabriel/anthony health), `SystemMonitorDashboard` (route `/monitor`, polls `/api/v1/monitoring/metrics` every 5s), `SystemRelationshipsGraph`.

> [!warning] Every saint feature that hits `/api/v1/saints/*`, `/api/v1/monitoring/*`, or `/api/v1/trinity/*` depends on a backend that is **not in this repository**. The [[Express Server]] (`server/index.ts:25-29`) only mounts terra, bridges, webhooks, raphael, and iot routers. The dashboards are built to degrade — demo replies, cached finance data, Joseph's recovery mode, on-device LLM — so a working UI does not prove the Saints API exists in your environment.

> [!note] St. Anthony has no component directory of his own; his audit dashboard and panels live in `src/components/anthony/` (`StAnthonyAuditDashboard`, `LostFoundLedger`, `JITAccess`, `EventStream`, `DataFlowMap`). He appears in council rosters as "Memory & Discovery / Guardian of Truth".

## Key Files

- `src/components/StMichaelSecurityDashboard.tsx` — Michael's tabbed security dashboard (727 lines)
- `src/components/michael/` — threat detection, CVE scanner, file integrity, compliance, guardian log, DHT anomaly chain
- `src/components/gabriel/StGabrielFinanceDashboard.tsx` — Gabriel's finance dashboard with Plaid + WiseGold
- `src/components/StJosephFamilyDashboard.tsx` — Joseph's 16-tab family hub (811 lines)
- `src/components/joseph/` — family tree, GEDCOM tools, quiz, media intel, voice profile components
- `src/components/anthony/StAnthonyAuditDashboard.tsx` — Anthony's audit dashboard
- `src/components/saints/` — CouncilRoom, MissionBoard, SaintsGuardian, SystemMonitorDashboard, SystemRelationshipsGraph
- `src/components/SaintChat.tsx` — shared saint chat with on-device LLM fallback
- `src/lib/saintBridge.ts` — SEP event bus (BroadcastChannel + localStorage log)
- `src/lib/michael/security.ts`, `src/lib/gabriel/finance.ts`, `src/lib/joseph/genealogy.ts` — per-saint API/data layers

## Related

- [[St Raphael]] — the fifth (and original) saint; health domain
- [[Saints Dashboard UI]] — the main dashboard that routes into each saint
- [[Trinity and Council]] — cross-saint fusion features and deliberation UIs
- [[Custom Engrams]] — user-trained AIs surfaced inside Joseph's dashboard
- [[Archetypal AIs]] — how fixed saint personas differ from trained personalities
- [[Express Server]] — what the in-repo Node backend actually serves (not the Saints API)
- [[Pages and Routing]] — route table where each saint dashboard is registered
