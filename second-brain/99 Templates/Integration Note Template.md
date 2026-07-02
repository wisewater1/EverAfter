---
tags: [health, integration]
updated: {{date}}
---

# {{title}}

> Which provider this integrates, what data it brings in, and through which path (direct OAuth, aggregator, webhook).

## Connection Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant P as Provider
    U->>A: Connect
    A->>P: OAuth authorize
    P->>A: Callback + tokens
```

## Data Ingested

| Metric | Unit | Table |
| ------ | ---- | ----- |
|        |      |       |

## Key Files

- OAuth start/callback —
- Webhook handler —
- Frontend UI —

## Secrets / Config

- `PROVIDER_CLIENT_ID`, `PROVIDER_CLIENT_SECRET`

## Gotchas

> [!warning]
> Rate limits, sandbox vs production, token refresh quirks.

## Related

- [[Health Integrations MOC]]
