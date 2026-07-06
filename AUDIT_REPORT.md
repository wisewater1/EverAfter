# EverAfter Full App Audit and Horizontal Directionality Report

Branch: `audit/horizontal-directionality`, base commit `d27d3b2` (main).
Date: 2026-07-06.

This report covers two missions: (1) verify everything works, (2) enforce left-to-right directionality across wording, interactions, animations, and iconography. Sections marked FINAL are filled in at the end of the pass; everything else is recorded as the audit progresses.

## 1. Baseline (recorded before any change)

### Toolchain
| Tool | Version |
| --- | --- |
| node | v22.22.2 |
| npm | 10.9.7 |
| vite | 5.4.21 |
| typescript | 5.9.3 (package range ^5.5.3) |
| eslint | 9.39.1 |
| vitest | 4.0.18 |

### Gates
| Gate | Baseline result |
| --- | --- |
| `npx tsc --noEmit` | Clean, exit 0 |
| `npm run build` | Success in 15.41s. Pre-existing warning: `web-llm` chunk is 6,040 kB (2,144 kB gzip), from the Crystal runtime evaluation. Non-blocking. |
| `npx eslint . --ext .ts,.tsx` | 1210 problems: 1096 errors, 114 warnings. This is the baseline ceiling; the final count must be at or under it. |
| `npx vitest run` | 14 files, 96 tests, 96 passed. One test intentionally exercises the backend-unreachable fallback path and logs ECONNREFUSED 127.0.0.1:8010; it passes. |

### npm audit (recorded, not auto-fixed)
7 vulnerabilities: 1 low, 2 moderate, 2 high, 2 critical.

| Package | Severity | Advisory |
| --- | --- | --- |
| vitest 4.0.x | critical | fix available via `npm audit fix` |
| form-data 4.0.0-4.0.5 | high | CRLF injection, GHSA-hmw2-7cc7-3qxx |
| @babel/core <=7.29.0 | low | sourceMappingURL arbitrary file read, GHSA-4x5r-pxfx-6jf8 |
| esbuild <=0.24.2 (via vite, vitest) | moderate | dev-server request exposure, GHSA-67mh-4wv8-2f99 |
| js-yaml 4.0.0-4.1.1 | moderate | fix available via `npm audit fix` |

All are dev-time or transitive; none ship in the production bundle directly. Recommendation: run `npm audit fix` (no `--force`) in a dedicated PR and re-run the full gate battery.

## 2. Phase 1B: Static integrity (in progress)

## 3. Phase 1C: Runtime smoke test (pending)

## 4. Phase 2A: Wording changes (pending)

## 5. Phase 2B: Interaction, animation, icon changes (pending)

## 6. Phase 2C: Layout and flow changes (pending)

## 7. Needs Joshua's decision

## 8. Known issues ranked by severity

## 9. FINAL verification proof (pending)
