---
tags: [legacy, family, engrams, personality, frontend]
updated: 2026-07-02
---

# Family Engrams

Family engrams are AI representations of a user's relatives: a `family_members` row plus a linked `engrams` row holding personality traits and background. Three dashboard components (FamilyEngrams, FamilyMembers, UnifiedFamilyInterface) build and manage these profiles, and the Family Intelligence page analyzes the whole family tree through the Saints.

## Overview

The Dashboard's "engrams" view (`src/pages/Dashboard.tsx:533-541`) stacks `FamilyEngrams`, `UnifiedFamilyInterface` (labeled "Family Hub"), and the [[Custom Engrams]] training dashboard. All of them read the same `family_members` table, filtered by `user_id`, but they were written at different times and expect different columns (FamilyEngrams reads `avatar_url`; FamilyMembers reads `email`, `status`, `access_level`, `invited_at`).

## How It Works

### FamilyEngrams — create and train

`src/components/FamilyEngrams.tsx` shows a card grid with stats (members, moments, active engrams, interactions). Creating an engram is a 3-step modal that inserts a `family_members` row, then an `engrams` row with `personality_traits` (selected traits plus generated `Interested in X` / `Values Y` strings), `background_info`, `interaction_style: 'conversational'`, and `knowledge_domains`. Loading is batched: two bulk `.in()` queries fetch engrams and `family_moments` counts for all members instead of N+1 per-member queries.

The component also surfaces in-progress **personality questionnaires** (the family-member analog of [[365-Day Personality Training]]): sessions are stored in localStorage via `src/lib/joseph/quizSessions.ts`, the quiz itself is the lazy-loaded `src/components/joseph/PersonalityQuiz.tsx` opened in an in-place modal, and "Send Quiz Link" mints a server invite (`apiClient.createQuizInvite`) producing a public `/quiz/<token>` URL the relative can answer with no account, falling back to a local link offline.

### FamilyMembers — invites and questions

`src/components/FamilyMembers.tsx` manages invitations: inserts into `family_members` with `status: 'pending'`, sends individual personality questions into `family_personality_questions`, and opens `src/components/PersonalityProfileViewer.tsx` for the accumulated profile.

> [!warning] The "AI Chat" modal in FamilyMembers is not an AI. `generateAIResponse` (`FamilyMembers.tsx:185`) is keyword matching over the input string with a 1.5 s `setTimeout` to fake typing. No LLM, edge function, or [[Archetypal AIs|archetypal AI]] is involved.

### UnifiedFamilyInterface — the Family Hub

`src/components/UnifiedFamilyInterface.tsx` combines tabs for members, question responses, daily questions, media upload, export, and an embedded [[St Raphael]] hub. Notable behavior:

- Invitations go through the **FastAPI backend** (`POST /api/v1/invitations` via `src/lib/backend-request.ts`), returning an invitation URL and delivery status — unlike FamilyMembers, which only writes a Supabase row.
- Question responses come from `daily_question_responses` joined to `archetypal_ais`.
- Export builds JSON/CSV entirely client-side from already-loaded state.

### FamilyIntelligence — analyze the tree

`src/pages/FamilyIntelligence.tsx` (route `/family-intelligence`, back button to `/family-dashboard`) renders `getFamilyTreeAnalysis()` from `src/components/trinity/trinityApi.ts:464`. The analysis interlaces three of [[The Saints]]: St. Joseph (family graph/hereditary patterns), St. Raphael (per-member wellness), and St. Gabriel (elder-care finances) — the same [[Trinity and Council]] framing used elsewhere. It shows a weighted family vitality score, per-member wellness rings with risk levels and trajectories, hereditary condition signals across generations, and an elder-care funding gap.

> [!note] `getFamilyTreeAnalysis()` is computed locally from the genealogy and health model in `trinityApi.ts` — "keyless" by design, so the page works in demo mode without any backend call. Its numbers are heuristics, and the page footer explicitly disclaims medical or genetic diagnosis.

## Data Model

| Table | Used by | Purpose |
|---|---|---|
| `family_members` | all three components | one row per relative, `user_id`-scoped |
| `engrams` | FamilyEngrams | personality traits, background, knowledge domains per member |
| `family_moments` | FamilyEngrams | memories/moments counted per member |
| `family_personality_questions` | FamilyMembers | ad-hoc questions sent to a relative |
| `daily_question_responses` | UnifiedFamilyInterface | answers joined to `archetypal_ais` |

`supabase/migrations/20260620180000_family_members_genealogy_and_fks.sql` is the most recent migration touching `family_members` (genealogy fields and foreign keys).

## Key Files

- `src/components/FamilyEngrams.tsx` — card grid, create-engram modal, questionnaire activity panel
- `src/components/FamilyMembers.tsx` — invite flow, question sender, canned "AI chat"
- `src/components/UnifiedFamilyInterface.tsx` — Family Hub tabs, FastAPI invitations, export
- `src/pages/FamilyIntelligence.tsx` — Trinity-based family analysis page
- `src/components/trinity/trinityApi.ts` — `getFamilyTreeAnalysis()` and the local fallback models
- `src/components/joseph/PersonalityQuiz.tsx` — the questionnaire relatives answer
- `src/lib/joseph/quizSessions.ts` — localStorage quiz-session store and share-message builders
- `src/components/PersonalityProfileViewer.tsx` — renders a member's accumulated profile

## Related

- [[Custom Engrams]] — the general (non-family) engram system and its chat pipeline
- [[365-Day Personality Training]] — the daily-question mechanism the family variant reuses
- [[Trinity and Council]] — the Joseph/Raphael/Gabriel coordination behind Family Intelligence
- [[Legacy Vault]] — where an engram can be archived when a companion is retired
- [[Legacy and Family MOC]] — area hub
- [[The Saints]] — persona context for saint-attributed analysis
