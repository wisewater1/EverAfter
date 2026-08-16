---
tags: [operations, documentation, index, ground-truth]
updated: 2026-08-16
---

# Documentation Index

A curated map of the repo's own documentation: what to trust, in what order, and what to ignore. The repo once had 150+ root-level markdown files with contradictory "COMPLETE" claims; those were moved to `docs/archive/` and superseded. Only a handful of current documents survive, listed below.

## Ground Truth — read first

- `CURRENT_STATE.md` — **the single dated ground-truth doc** (revision 2026-08-15). What is live vs not, gate status (tests/build/type-check/lint), verified security posture, orphaned components, error-response convention. Every claim verified against code and deploy configs, with per-section measurement dates. When any other doc disagrees with it, it wins; when it disagrees with the code, the code wins.
- `CLAUDE.md` — day-to-day agent/developer guidance: commands, architecture summary, conventions, gotchas. Architecture section rewritten 2026-07-12 to match `CURRENT_STATE.md`; defers to it on conflict.

## Audits (`docs/audits/`)

The 2026-07 engagement audits — dated, verified, still the best record of why things are the way they are:

- `docs/audits/2026-07-11-demo-and-main-experience-audit.md` — Step 1 audit of the demo and main experience
- `docs/audits/2026-07-12-step4-final-qa.md` — engagement closing report: remaining debt, the fabricated-data removal (PRs #110–#117), owner-only App Store checklist

## Surviving Root-Level Guides

- `README.md` — project intro and quick start (React/TypeScript/Supabase overview)
- `FABLE_FINALIZATION_PROMPT.md` — the 2026-07-02 finalization brief (iOS App Store + production launch) built from a 13-dimension ground-truth audit; historical context for the truthfulness work

## Current Design and Architecture Docs (`docs/`)

- `docs/FAMILY_DATA_MODEL.md` — the shared family/person data model every Saint and Trinity Dashboard tab reads and writes
- `docs/ELOHIM_INTEGRATION.md` — the signed, post-quantum, tamper-evident ledger behind the `everafter-elohim-anchor` Render worker; expects the Elohim repo cloned at a `vendor/elohim` path that is not committed
- `docs/SITE_REPAIR_AUDIT.md` — running log of the site repair and Trinity build: found broken → fixed → verified
- `docs/CRYSTAL_RUNTIME_EVALUATION.md` — measured Crystal-vs-FastAPI evaluation for the Saints chat layer
- `docs/ghost-cone-volumetric-apparition.md` — research doc on volumetric "ghost-cone" display with AI personality integration (speculative, not implemented)

## The Archive — do not trust

> [!warning] `docs/archive/` holds 150+ historical snapshot docs moved out of the repo root. Many self-declare "COMPLETE" with contradictory dates and metrics (e.g. multiple conflicting deployment checklists, status reports, and architecture snapshots). `CURRENT_STATE.md` explicitly supersedes all of them. Use them only as archaeology for *why* something was built — never as evidence of what is currently true.

## This Vault

`second-brain/` (this vault) is the curated knowledge base. Most notes were written 2026-07-02 and the codebase has moved ~36 PRs since; notes updated 2026-08-16 (this one and its [[Operations MOC]] siblings) reflect the current state. Verify older notes' claims against `CURRENT_STATE.md` and the code — [[Common Gotchas]] collects the drift already found.

## Reading Order for a Returning Developer

1. `CURRENT_STATE.md` — what is real today
2. `CLAUDE.md` — how to work here (commands, conventions)
3. [[Operations MOC]] → [[Deployment]], [[Commands Cheatsheet]], [[Environment Variables]] — how to run and ship
4. `docs/audits/2026-07-12-step4-final-qa.md` — what debt remains and why

## Key Files

- `CURRENT_STATE.md` — ground truth, dated 2026-08-15
- `CLAUDE.md` — agent/developer working guide
- `docs/audits/` — the two 2026-07 engagement audits
- `docs/archive/` — 152 superseded snapshot docs (do not trust)
- `second-brain/Home.md` — vault entry point

## Related

- [[Operations MOC]] — hub for all operations notes
- [[Common Gotchas]] — code-verified traps, including doc-vs-code discrepancies
- [[Deployment]] — the current deploy story the archived checklists used to describe
- [[Testing Strategy]] — where the real testing docs live (the old `docs/archive/TESTING_GUIDE.md` was a device-integration plan, now archived)
- [[System Overview]] — the vault's own architecture summary
- [[Home]] — vault entry point
