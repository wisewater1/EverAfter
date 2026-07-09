---
tags: [database, schema, tables, supabase]
updated: 2026-07-02
---

# Key Tables

The load-bearing tables of the EverAfter database, verified against the actual `CREATE TABLE` statements in `supabase/migrations/`. Column lists below are abridged to what matters; the migration files are the authority.

## Data Model

### Identity and profile

- **`profiles`** (`supabase/migrations/20251006070133_create_everafter_schema.sql:82`) — extends `auth.users` (PK `id` references `auth.users(id)`); `email`, `display_name`, `time_zone`, `notification_preferences jsonb`, `language`, `date_format`. Most user-owned tables FK to it. Populated by signup triggers that took several `fix_signup_*` migrations to stabilize.

### AI personalities

- **`archetypal_ais`** (`supabase/migrations/20251020013555_add_archetypal_ai.sql:57`) — one row per user-built AI ([[Archetypal AIs]]): `user_id → profiles`, `name`, `description`, `personality_traits jsonb`, `total_memories`, `training_status` (`untrained | training | ready`), `avatar_url`. An `archetype` column (`philosopher | advisor | companion | creative | mentor | custom`) was added later in `20251027070000_add_archetype_to_archetypal_ais.sql`. Companions: `ai_conversations`, `ai_messages`.
- **`engrams`** (`supabase/migrations/20251025060239_consolidate_missing_tables.sql:66`) — the other personality container used by [[Custom Engrams]] and [[Family Engrams]]: `user_id`, `name`, `engram_type` (`custom | family_member`), `relationship`, `ai_activated`, `ai_readiness_score`, `total_responses`. Health tables FK to `engrams`, not `archetypal_ais`.

> [!warning] Two overlapping "AI personality" tables
> `archetypal_ais` and `engrams` coexist and both mean "an AI personality." Embedding tables FK to `archetypal_ais`; task and health tables FK to `engrams`. `20260104100000_comprehensive_schema_fix.sql` even re-declares `engrams` with a different column set (`personality_data`, `voice_settings`) under `IF NOT EXISTS`, so the live shape depends on which migration created it first. Check the actual database before assuming columns.

### 365-day training

- **`daily_question_pool`** (`supabase/migrations/20251020050113_multilayer_personality_dimensions.sql:136`) — enhanced question bank for [[365-Day Personality Training]]: `question_text`, `category_id → question_categories`, `dimension_id → personality_dimensions`, `difficulty_level` (1–5), `follow_up_questions text[]`, `day_range_start/end`, `is_active`, `usage_count`.
- **`daily_question_responses`** (`supabase/migrations/20251020022430_enhance_daily_question_system.sql:57`) — user answers: `user_id`, `question_id → questions`, snapshot `question_text`, `response_text`, `day_number` (1–365 CHECK), `mood`, `embedding_generated`. `training_permitted boolean` added by `20260310000000_add_training_permitted_to_daily_question_responses.sql` because the ORM expected it.

> [!note] There is no `daily_responses` table
> The per-engram variant is `engram_daily_responses` (`20251025060239_consolidate_missing_tables.sql:113`), which ties answers to a specific engram with `question_category` and `personality_tags jsonb`.

### Saints and subscriptions

- **`saints_subscriptions`** (`supabase/migrations/20251025060239_consolidate_missing_tables.sql:245`) — per-user activation of [[The Saints]]: `user_id`, `saint_id` CHECK in (`raphael`, `michael`, `martin`, `agatha`), `is_active`, `settings jsonb`, `UNIQUE(user_id, saint_id)`. A generic Stripe `subscriptions` table lives in the same migration ([[Payments and Subscriptions]]).

### Tasks

- **`agent_task_queue`** (`supabase/migrations/20251020050000_autonomous_task_execution.sql:48`) — background queue for the [[Autonomous Task System]]: `engram_id → engrams`, `user_id → auth.users`, `task_type` (doctor_appointment, prescription_refill, insurance_claim, lab_results, health_reminder, email_send, research, custom), `priority`, `status` (`pending | awaiting_credentials | in_progress | completed | failed | cancelled | requires_approval`), `scheduled_for`, `retry_count`/`max_retries`, `credential_ids uuid[]`, `execution_config jsonb`, `result jsonb`. Step-level logs live in `agent_task_executions`.
- **`engram_ai_tasks`** (`supabase/migrations/20251025082740_create_unified_engram_task_system.sql:20`) — declared "the ONE task system" replacing the fragmented earlier ones: `user_id → profiles`, `engram_id → engrams`, `title`, `task_description`, `status` (`pending | in_progress | done | failed | cancelled`), `details jsonb`, `execution_log jsonb`, `completed_at` (set by trigger `update_engram_task_timestamp`). Policies use `(select auth.uid())` from day one. Note `agent_task_queue` still exists alongside it.

### Health data

- **`glucose_readings`** (`supabase/migrations/20251025120000_create_glucose_metabolic_system.sql:55`) — CGM time series for [[Glucose Monitoring and Alerts]]: `user_id`, `engram_id` (NOT NULL), `ts`, `value`, `unit` default `'mg/dL'`, `src` CHECK in (`dexcom`, `libre-agg`, `terra`, `manual`, `fhir`), `trend`, `quality`, `raw jsonb`, idempotency via `UNIQUE(user_id, engram_id, ts, src)`. Siblings: `glucose_daily_agg` (TIR %, GMI, hypo/hyper counts; PK `(day, user_id, engram_id)`), `lab_results`, `metabolic_events`, `connector_tokens` (service-role-only OAuth vault), `connector_consent_ledger`, `glucose_job_audit`.
- **`health_metrics`** (`supabase/migrations/20251025110000_create_health_connectors_system.sql:74`) — normalized metric store ([[Health Data Normalization]]): `id bigserial`, `user_id`, nullable `engram_id`, `source`, `metric`, `value numeric`, `unit`, `ts`, `raw jsonb`. Indexed on `(user_id, ts)` and `(user_id, metric, ts)`. An earlier, simpler `health_metrics` was created in `20251025065152_add_health_tracking_system.sql:36` — both use `IF NOT EXISTS`, so the earlier shape wins where it already existed.
- **`provider_accounts`** (`supabase/migrations/20251025110000_create_health_connectors_system.sql:52`, re-asserted in `20251025160122_create_provider_accounts_and_webhook_events.sql`) — one row per connected provider ([[Health OAuth Flow]]): `user_id`, `provider`, `external_user_id`, `access_token`, `refresh_token`, `scopes text[]`, `webhook_secret`, `status`, `last_sync_at`, `UNIQUE(user_id, provider)`.
- **`webhook_events`** (same two migrations) — raw inbound payload log for the [[Webhook Ingestion Pipeline]]: `provider`, `event_id`, `payload jsonb`, `signature`, `dedup_key` (indexed for idempotency), `processed`, `error`, `metrics_inserted`. No user-facing policies; written via service role only.

### Vector embeddings

Created in `supabase/migrations/20251020021144_add_vector_embeddings_system.sql` for [[Embeddings and Vector Search]] — all with `embedding vector(1536)` and HNSW cosine indexes (`m = 16, ef_construction = 64`):

- **`engram_memory_embeddings`** — `engram_id → archetypal_ais` (yes, despite the name), `content`, `metadata jsonb`. Queried by RPC `match_engram_memories()`.
- **`family_member_embeddings`** — `family_member_id → family_members`; RPC `match_family_member_memories()`.
- **`conversation_context_embeddings`** — per-message embeddings FK'd to `ai_conversations`/`ai_messages`; RPC `match_conversation_context()`.
- Later additions: `agent_memories` (`20251025093736`) and the knowledge tables in `20251027020000_create_ai_knowledge_system.sql` ([[Knowledge Base System]]).

> [!warning] `vector_embeddings` does not exist
> `CLAUDE.md` refers to a `vector_embeddings` table; no migration creates one. Search for the three tables above instead.

## Key Files

- `supabase/migrations/20251006070133_create_everafter_schema.sql` — profiles, questions, memories, family_members, saint_activities.
- `supabase/migrations/20251020013555_add_archetypal_ai.sql` — archetypal_ais + conversations/messages.
- `supabase/migrations/20251020021144_add_vector_embeddings_system.sql` — pgvector tables and match_* RPCs.
- `supabase/migrations/20251020050113_multilayer_personality_dimensions.sql` — daily_question_pool and personality dimensions.
- `supabase/migrations/20251025060239_consolidate_missing_tables.sql` — engrams, saints_subscriptions, subscriptions.
- `supabase/migrations/20251020050000_autonomous_task_execution.sql` — agent_task_queue and execution logs.
- `supabase/migrations/20251025082740_create_unified_engram_task_system.sql` — engram_ai_tasks.
- `supabase/migrations/20251025120000_create_glucose_metabolic_system.sql` — glucose/metabolic tables.
- `supabase/migrations/20251025110000_create_health_connectors_system.sql` — provider_accounts, health_metrics, webhook_events.

## Related

- [[Database Overview]] — how these tables fit into the overall store and who accesses them.
- [[Row Level Security]] — the policies attached to each of these tables.
- [[Migrations]] — where and how these definitions live and get applied.
- [[Autonomous Task System]] — runtime behavior on agent_task_queue / engram_ai_tasks.
- [[Glucose Monitoring and Alerts]] — consumers of glucose_readings and glucose_daily_agg.
- [[Embeddings and Vector Search]] — how the embedding tables are queried at chat time.
- [[365-Day Personality Training]] — the flow that fills daily_question_responses.
