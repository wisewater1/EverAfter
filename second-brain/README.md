# EverAfter Second Brain

An [Obsidian](https://obsidian.md) vault that documents the EverAfter codebase as an interlinked knowledge base — architecture, edge functions, health integrations, AI systems, database schema, security, and operations.

## How to open

1. Install Obsidian (free) from https://obsidian.md
2. **Open folder as vault** → select this `second-brain/` directory
3. Start at **[[Home]]** — pin it, it's the dashboard
4. Open the graph view (`Ctrl/Cmd+G`) to see how subsystems connect

## How it's organized

| Folder | Contents |
| ------ | -------- |
| `01 Maps/` | MOCs (Maps of Content) — hub notes that index each domain |
| `10 Architecture/` | System-level design: dual backend, auth, tech stack |
| `20 Frontend/` | React app: pages, routing, design system, state |
| `30 Backend/` | 55 Supabase Edge Functions + Express server + workers |
| `40 Database/` | Supabase migrations, key tables, Prisma, RLS |
| `50 AI Systems/` | St Raphael, Custom Engrams, Saints, embeddings, safety |
| `60 Health Integrations/` | Terra, Dexcom, Fitbit, Oura, FHIR, webhooks, alerts |
| `70 Legacy and Family/` | Legacy vault, family engrams, memorials, capsules |
| `75 Products/` | Career, Marketplace, Insurance, Beyond Modules |
| `80 Payments/` | Stripe checkout/webhooks, subscription tiers |
| `85 Security/` | PHI handling, webhook signatures, secrets |
| `90 Operations/` | Deployment, env vars, testing, gotchas, doc index |
| `99 Templates/` | Obsidian templates for new notes |

## Conventions

- **Wikilinks** (`[[Note Title]]`) connect concepts; follow backlinks to explore.
- **Frontmatter** on every note: `tags` (domain taxonomy) and `updated` (last verified date).
- **Code references** are backticked repo-relative paths like `src/components/RaphaelChat.tsx` — they point into the parent repository, one level up from this vault.
- **Callouts** flag operational hazards: `> [!warning]` marks gotchas that have bitten before.
- **MOC notes** (tagged `#moc`) are curated indexes — start there when exploring a domain.
- New notes: use `99 Templates/` via the core Templates plugin (already configured).

## Keeping it alive

This vault documents the code as of the `updated` date in each note's frontmatter. When you change a subsystem, update its note and bump the date — a second brain only works if it's trusted.
