---
tags: [ai-core, safety, guardrails, health-compliance]
updated: 2026-07-02
---

# Safety Guardrails

The rules that keep [[St Raphael]] and related health AIs from diagnosing, prescribing, or mishandling emergencies. As implemented, every guardrail is **prompt-level**: safety text is embedded in system prompts, with no output filtering or classifier anywhere in the codebase.

## Overview

The canonical rule set (repeated with small variations across implementations):

- Provide information and emotional support ONLY
- NEVER diagnose medical conditions
- NEVER prescribe treatments or medications
- ALWAYS encourage consulting licensed healthcare professionals
- In emergencies, direct users to local emergency services (911 in `raphael-chat`; 911/999/112 in `agent`)

> [!warning] CLAUDE.md claims "Check responses for medical claims before returning." No such check exists — neither `raphael-chat` nor `agent` inspects model output before returning it. The guardrails are instructions to the model, nothing more.

## Where Guardrails Live

| Location | Form |
|---|---|
| `supabase/functions/raphael-chat/index.ts:97-106` | Default system prompt with IMPORTANT SAFETY RULES block |
| `supabase/functions/agent/index.ts:354-378` | Same rules plus multi-region emergency numbers, in the tool-calling agent |
| `agents/raphael/manifest.json` | Structural guardrails for the autonomous runner: `maxTokens: 1800`, `timeoutMs: 25000`, `allowWeb: false`, `requiresConsent: [train, project]`, `medicalDisclaimer: true`; persona says "Never provide medical diagnosis" |
| `src/lib/llm/onDeviceLLM.ts:26-31` | On-device saint personas: Raphael is "not a doctor and never diagnose[s]" |
| `src/components/onboarding/MeetRaphaelStep.tsx` | User-facing framing of the same promises during [[Onboarding Flow]] |

> [!warning] Prompt-override bypass: `raphael-chat` accepts a `system` field in the request body that **replaces** the entire safety prompt (`const systemPrompt = system || …`). Any authenticated caller can strip the guardrails with one JSON key. The `agent` function does not accept a system override.

## Emergency Escalation

Chat-level escalation is prompt-only ("call 911"). The only code-level escalation path is in health-data ingestion, not chat: `supabase/functions/device-stream-handler/index.ts:352-381` classifies critical device alerts as `emergency` severity and looks up the user's `emergency_contacts` — but currently only logs "would notify N contacts" rather than sending anything. Glucose alert thresholds (urgent low <55 mg/dL, etc.) are defined for [[Glucose Monitoring and Alerts]], a separate clinical-threshold system from these conversational guardrails.

## The safety-monitor Function Is Not About Chat

> [!warning] CLAUDE.md lists `safety-monitor` as "Monitor St. Raphael safety guardrails." The code (`supabase/functions/safety-monitor/index.ts`) is a **data-integrity negative-delta detector**: it counts rows in eight health tables (`health_connections`, `health_unified_metrics`, `health_clinical_records`, …), compares against the last recorded counts in `health_data_integrity_log`, and flags any row-count decrease as `critical` DATA LOSS, logging an alert into `health_connection_audit`. It never looks at chat content. Actions: `?action=check` (default), `snapshot`, `compare`.

> [!note] Bug in `compare`: `compareWithSnapshot()` builds its URL from `Deno.env.get("SUPABASE_URL")` instead of the request URL (`index.ts:245`), so `snapshot_id` can never be read from the query string — the compare action always returns "Missing snapshot_id parameter."

## Gotchas

- Guardrail strength varies by entry point: the external "local backend" chat path used by `src/components/RaphaelChat.tsx` is not in this repo, so its prompt (if any) is unverifiable here.
- `engram-chat` has **no** safety rules at all — engram personas are told only to "respond naturally and authentically." A health-flavored custom engram inherits zero medical guardrails.
- The safety text differs slightly between copies (US-only 911 vs 911/999/112); there is no shared constant, so edits must be made in every file.

## Related

- [[St Raphael]] — the persona these rules protect
- [[AI Chat Edge Functions]] — where each prompt lives in the function inventory
- [[Custom Engrams]] — the guardrail-free chat path to be aware of
- [[Security Overview]] — broader threat model beyond prompt safety
- [[Glucose Monitoring and Alerts]] — clinical alert thresholds (the other "safety" system)
- [[PHI Handling]] — the data-side compliance rules that pair with these conversational rules
- [[Common Gotchas]] — repo-wide list including the docs-vs-code mismatches flagged here
