---
tags: [ai-systems, archetypal-ais, personality, engrams]
updated: 2026-07-02
---

# Archetypal AIs

Archetypal AIs are user-trained AI personalities: the user answers daily questions ("memories"), keyword heuristics extract traits and values, and once an AI has 50+ memories it becomes conversational in `ArchetypalAIChat`. This is the same system marketed as [[Custom Engrams]] — the tables and components overlap heavily.

## Data Model

Core table `archetypal_ais` (documented in `ARCHETYPAL_AI_TECHNICAL.md`, extended by migrations):

- Identity: `name`, `description`, `avatar_url`, `archetype` — the archetype column was added in `supabase/migrations/20251027070000_add_archetype_to_archetypal_ais.sql` with allowed values `philosopher | advisor | companion | creative | mentor | custom` (default `custom`).
- Personality: `personality_traits[]`, `core_values[]`, `communication_style`, `foundational_questions` (jsonb of the first answered questions).
- Training state: `total_memories`, `readiness_score` (0-100; 100 at 50+ memories), `training_status`, `is_ai_active`, `interaction_count`, `personality_evolution_log`.

Supporting tables: `archetypal_conversations` (every user/AI exchange, with `context_memories` and metadata; a trigger bumps `interaction_count`), `ai_personality_evolution` (snapshots via `capture_personality_snapshot`, roughly every 10 memories), and `daily_question_responses` (the training data — each row is a "memory" linked by `archetypal_ai_id`). Training input flows in through [[365-Day Personality Training]].

## How It Works

### Chat — `src/components/ArchetypalAIChat.tsx`

- Loads all of the user's `archetypal_ais`; AIs under a `readiness_score` of 50 are shown as "in training" (`n/50 memories`) and cannot chat.
- **Single mode** talks to one AI; **dual mode** ("Both Perspectives") asks the first two ready AIs the same question and renders both answers side by side.
- `generateAIResponse` (`ArchetypalAIChat.tsx:260`) builds context from the last 15 `daily_question_responses` and last 5 `archetypal_conversations`, then composes the reply.
- Every exchange is persisted to `archetypal_conversations` (dual-mode replies carry `conversation_metadata.dual_mode`).

> [!warning] There is **no LLM call** in the shipped chat path. The full OpenAI-style system prompt exists only inside a block comment (`ArchetypalAIChat.tsx:289-315`); the actual reply is a local template that interpolates the AI's traits, values, communication style, and one memory snippet (`:319-329`). `ARCHETYPAL_AI_TECHNICAL.md` describes calling OpenAI/Claude as a production step that has not happened. Do not expect real generative answers from this component.

### Personality extraction — `src/lib/archetypal-ai-helpers.ts`

`extractPersonalityFromMemories` runs six keyword analyzers over all responses (traits, values, communication patterns, knowledge domains, emotional tone, thinking style) and `updateAIPersonalityProfile` writes the top results back to `archetypal_ais`. This is frequency counting, not ML. A repo search shows no component currently imports this helper; the server-side equivalent is the `generate-personality-profile` Edge Function (used by `PersonalityProfileViewer`), and [[Embeddings and Vector Search|embeddings]] are generated separately by `generate-embeddings`.

## Relationship to saints and engrams

Three "AI personality" concepts coexist and are easy to confuse:

1. **[[The Saints]]** — fixed, hardcoded personas (Michael, Gabriel, Joseph, Anthony, Raphael) backed by an external Saints API. Not trained by users.
2. **Archetypal AIs** (this note) — user-trained personalities in `archetypal_ais`, chatted with via `ArchetypalAIChat` and the `engram-chat` Edge Function (which reads `archetypal_ais` and retrieves memories via the `match_engram_memories` RPC — see [[AI Chat Edge Functions]]).
3. **`engrams` table** — a separate table used by `raphael-chat`, `task-create`, and the `agent` function (which auto-creates a "St. Raphael" engram row). It is *not* the same as `archetypal_ais`, yet `EngramTaskManager` loads its "engrams" list **from `archetypal_ais`** (`training_status === 'ready'`) while creating tasks keyed by `engram_id` against `agent_task_queue`, whose FK points at `engrams` (see [[Autonomous Task System]]).

> [!note] In practice "custom engram" and "archetypal AI" are the same user-facing feature; `StJosephFamilyDashboard`'s "Custom Engrams" tab renders `CustomEngramsDashboard`, and `RitualAltar` lists `archetypal_ais` as ritual "ancestors" ([[Trinity and Council]]).

## Key Files

- `src/components/ArchetypalAIChat.tsx` — single/dual chat UI, readiness gating, templated responses (546 lines)
- `src/lib/archetypal-ai-helpers.ts` — keyword-based personality extraction + profile update
- `src/components/CustomEngramsDashboard.tsx` — AI creation/management/training progress UI
- `src/components/DailyQuestionCard.tsx` — the training (question answering) interface
- `supabase/functions/engram-chat/index.ts` — server-side chat over `archetypal_ais` with vector memory retrieval
- `supabase/migrations/20251027070000_add_archetype_to_archetypal_ais.sql` — archetype column + constraint
- `ARCHETYPAL_AI_TECHNICAL.md` — schema and design doc (its "response generation" section is partly aspirational)

## Related

- [[Custom Engrams]] — the product framing of this same system
- [[365-Day Personality Training]] — where the training memories come from
- [[AI Chat Edge Functions]] — engram-chat, the LLM-backed path for these AIs
- [[Embeddings and Vector Search]] — memory retrieval used server-side
- [[The Saints]] — the fixed personas these user AIs sit alongside
- [[Autonomous Task System]] — tasks executed "by" an engram/AI
- [[Family Engrams]] — family-member variants of trained personalities
