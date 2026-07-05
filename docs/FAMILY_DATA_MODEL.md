# Family and Person Data Model

This document describes the shared family and person data model that every
Saint and every Trinity Dashboard tab reads from and writes to. It is the
backbone referenced in Part 3 and Part 4 of the site build.

## The canonical person entity

Every person in a user's family is one canonical row in
`public.family_members`, owned by `user_id`, with a stable uuid `id`. The
client-side genealogy graph (`src/lib/joseph/genealogy.ts`) uses short
string ids for members (`u1`, `p1`, or a generated `m_<timestamp>` for new
members). The bridge between the two is the `legacy_id` column: it stores
the client graph id so a member can be upserted deterministically by
`(user_id, legacy_id)` and looked up again on the next load.

`getCanonicalMemberId(clientId)` in `genealogy.ts` returns the uuid for a
client id once the member is persisted, so any feature can foreign-key
against the same person row rather than matching by name.

### `public.family_members` (canonical person)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | canonical person id |
| `user_id` | uuid | owner (RLS scope) |
| `legacy_id` | text | client graph id bridge, unique per user |
| `first_name`, `last_name` | text | name |
| `gender` | text | male / female / other |
| `birth_date`, `death_date` | date | life dates |
| `birth_place`, `photo_url`, `bio` | text | profile |
| `generation` | int | tree layer relative to the account holder |
| `occupation`, `family_role` | text | |
| `engram_id` | text | links to the person's AI engram |
| `calendar_url` | text | iCal feed |
| `metadata` | jsonb | AI personality, info stack, media permissions, sources |

Uniqueness: `UNIQUE (user_id, legacy_id)` (full index, so PostgREST upsert
`onConflict: user_id,legacy_id` works).

## Relationships

`public.family_member_links` holds the edges between canonical people.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `user_id` | uuid | owner (RLS) |
| `from_member_id` | uuid | FK family_members |
| `to_member_id` | uuid | FK family_members |
| `link_type` | text | parent, child, spouse, sibling |

`UNIQUE (user_id, from_member_id, to_member_id, link_type)`. The RLS policy
additionally checks that both endpoints belong to the caller.

## Life events and the timeline

`public.family_tree_events` records births, marriages, passings, milestones,
and ceremonies against a person. Trinity's Chronicle and Calendar read from
here.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `user_id` | uuid | owner (RLS) |
| `member_id` | uuid | FK family_members, nullable |
| `legacy_event_id` | text | client event id bridge, unique per user |
| `event_type` | text | birth, marriage, passing, milestone, ceremony, anniversary, other |
| `event_date` | date | |
| `title`, `description`, `location` | text | |

## How the pieces attach to one person

```
                         public.family_members (id, uuid)
                                     |
   +-------------------+-------------+-------------+------------------+
   |                   |             |             |                  |
family_member_links  family_tree_  ceremonies    vault_items       engrams
(relationship edges)  events        .honoree_/    .family_member_id .family_member_id
                      .member_id    participant_  (Will/Capsule for  (the person's
                                    member_ids     a person)          AI)
```

- **St. Joseph** (family coordination) owns the tree itself: adding a spouse,
  child, parent, or dependent creates the `family_members` row every other
  Saint attaches to.
- **St. Raphael** (health) attaches health context to the account holder's
  person node; `health_metrics` is keyed by `user_id`.
- **St. Gabriel** (finance) attaches budget and trust data by `user_id`.
- **St. Anthony** (guidance) reads the same tree plus the daily response
  history for guidance signals.
- **St. Michael** (protection) is the access layer: the RLS policies on every
  table above enforce owner-only access, and `vault_unlock_requests` governs
  successor access to sealed items.

## Trinity tabs read the same model

`getLocalTrinityContext()` in `src/components/trinity/trinityApi.ts` builds
its context from `getFamilyMembers()`, `getRelationships()`, and
`getFamilyEvents()` (the same genealogy singleton), enriched with the live
per-user signals gathered by `src/lib/trinity/liveSignals.ts`
(`health_metrics`, budget, guidance engagement, and protection counts).
Council, Chronicle, Elder Care, Inheritance, and What-If all derive from this
one context rather than keeping a separate copy of who someone is.

## Write path and durability

The genealogy singleton is the fast synchronous read model used across the
UI. `src/lib/joseph/genealogySync.ts` is its durable write-through:

1. On first read for a real (non-demo) session, the canonical Supabase store
   is loaded and merged with the local cache.
2. Any local-only members, links, or events are backfilled to Supabase.
3. Every subsequent add or edit writes through to `family_members`,
   `family_member_links`, and `family_tree_events`.

Demo sessions use a separate localStorage namespace (`...:demo`) and never
touch the network, so demo edits never leak into a real account and vice
versa. The seeded sample family ships only for demo and local development;
real accounts start empty and build their own tree.
