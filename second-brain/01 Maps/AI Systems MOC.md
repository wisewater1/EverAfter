---
tags: [ai-core, moc]
updated: 2026-07-02
---

# AI Systems MOC

Hub for everything model-shaped in EverAfter: the health companion, the Saints personas, user-trained engrams, the training/retrieval pipelines beneath them, and the safety story. All LLM calls go to OpenAI (mostly `gpt-4o-mini` + `text-embedding-3-small`), despite docs mentioning Groq. Start with [[St Raphael]] for the flagship product or [[Custom Engrams]] for the personality machinery.

## Companions and Personas

- [[St Raphael]] — health AI companion: raphael-chat, the tool-calling `agent`, frontend chat, and the autonomous 9 AM runner
- [[The Saints]] — the persona family (Raphael, Michael, Martin, Agatha) and how saints are activated per user
- [[Trinity and Council]] — multi-persona coordination layer above individual saints
- [[Archetypal AIs]] — the `archetypal_ais` table and archetype concept underlying every persona

## Personality Training

- [[Custom Engrams]] — user-created AI personalities; engram-chat RAG pipeline and the training dashboard
- [[365-Day Personality Training]] — one question per day: question pool, progress/streaks, and the answer-to-memory pipeline
- [[Family Engrams]] — the family-member variant, including GPT-based personality profile generation

## Retrieval and Memory

- [[Embeddings and Vector Search]] — pgvector tables, HNSW indexes, match RPCs, and the mock-embedding hazard
- [[Knowledge Base System]] — knowledge-ingest / knowledge-query, the separate `text-embedding-3-large` store

## Autonomy and Safety

- [[Autonomous Task System]] — `agent_task_queue`, task creation from chat, and (simulated) execution
- [[Safety Guardrails]] — prompt-level no-diagnosis/no-prescription rules, the system-prompt override bypass, and why `safety-monitor` is really a data-integrity check

## Where the Code Lives

- [[AI Chat Edge Functions]] — function-by-function detail on the five conversational endpoints
- [[Agent and Task Edge Functions]] — the `agent` function and task queues
- [[Shared Edge Function Utilities]] — daily-question and profile-generation function catalog
- [[Saints Dashboard UI]] — main frontend surface for the personas

## Siblings

- [[Home]] — vault entry point
- [[Architecture MOC]] — system-level context around the AI layer
- [[Backend MOC]] — all 55 edge functions and the Express server
- [[Frontend MOC]] — chat and dashboard components
- [[Database MOC]] — the tables and RPCs these systems read and write
- [[Security MOC]] — guardrail and RLS caveats in one place
- [[Products MOC]] — the user-facing products built on these systems
