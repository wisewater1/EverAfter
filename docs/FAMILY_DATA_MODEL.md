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

## Household financial oversight

St. Gabriel's household review is built on the same canonical person rows.
Coverage attaches to `family_members.id`. There is no parallel financial
person table. St. Michael governs every financial read through one
authorization gate in the database, and the Family Tree is the surface where
authority is granted, visualized, and revoked.

Canonical terms: a Household is the set of person nodes on one tree that
share a financial planning scope (one tree can contain more than one
household). An Oversight Grant is the permission record authorizing Gabriel
to read a defined scope of one person's financial data for a defined period
on a defined authority. Michael's Attestation is the plain language statement
generated live from the grant set, never hand written and never cached as
copy. Coverage is whether a person node currently has an active grant.
Coverage Confidence is how complete the household picture is, shown beside
Financial readiness and never folded into it.

### `public.households`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | household id |
| `owner_user_id` | uuid | account that hosts the tree (RLS scope) |
| `name` | text | display name |
| `created_at` | timestamptz | |

### `public.household_members`

Membership and the published weighting used by the household score.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `household_id` | uuid | FK households |
| `person_id` | uuid | FK family_members, the canonical person |
| `member_user_id` | uuid | the person's own auth account when linked, else null |
| `role` | text | adult, minor, dependent_adult |
| `is_primary_earner` | boolean | raises the member's weight |
| `dependency_weight` | numeric | published weight, defaults by role |
| `joined_at`, `left_at` | timestamptz | `left_at` set = removed from household |

Removing a member (setting `left_at`) suspends every grant in that household
where the person is subject or grantor, pending explicit re-consent.

### `public.oversight_grants`

| Column | Type | Notes |
| --- | --- | --- |
| `grant_id` | uuid | |
| `household_id` | uuid | FK households |
| `subject_person_id` | uuid | FK family_members, whose finances are covered |
| `granted_by_person_id` | uuid | FK family_members, who authorized it |
| `owner_user_id` | uuid | tree owner (RLS) |
| `subject_user_id` | uuid | subject's own account when linked, for subject-side rights |
| `authority_basis` | text | self, guardian_of_minor, power_of_attorney, trustee, court_appointed_guardian, executor_or_administrator |
| `authority_document_id` | uuid | FK vault_items; required for every basis other than self (CHECK constraint) |
| `authority_document_label` | text | instrument type and date shown on the attestation |
| `scope` | text | balances_only, balances_and_obligations, balances_obligations_and_transactions, full_ledger |
| `included_account_ids` | uuid[] | explicit inclusion list, never an implicit all |
| `purpose_statement` | text | written at grant time, shown to the subject |
| `granted_at`, `effective_from`, `expires_at`, `review_due_at` | timestamptz | |
| `revoked_at`, `revoked_by_person_id`, `revocation_reason` | | revocation is instant and subject-controlled |
| `suspended_at`, `suspension_reason` | | set by relationship-change triggers, pending re-consent |
| `closed_by_passing_at` | timestamptz | verified passing closes the grant and hands off to the Inheritance path |
| `verification_method`, `verification_event_id` | | how the subject's consent was verified |

A grant is active only when now is inside `[effective_from, expires_at)` and
`revoked_at`, `suspended_at`, and `closed_by_passing_at` are all null. Every
financial read resolves through `fn_oversight_active_grants` at query time
and fails closed. `guardian_of_minor` grants are clamped by trigger to the
subject's age of majority (birth date plus eighteen years).

### `public.oversight_invitations`

One invitation plus one reminder per subject per household, then the product
stops asking permanently unless the subject re-opens the conversation.
`UNIQUE (household_id, subject_person_id)` enforces the single invitation and
a trigger rejects a second reminder.

### `public.financial_account_links` and `public.financial_account_snapshots`

Accounts are metadata plus an explicit holder list (`holders uuid[]`, person
ids). Values live in append-only snapshots (`balance`, `total_obligation`,
`as_of`). Provider linking stores read-only token references only, never raw
credentials. A joint account contributes to the household roll-up only when
every holder has an active grant including it; with a partial grant set, only
the granting holder's equal share is included and the account is marked
partially covered.

### `public.oversight_audit_events`

Append-only and tamper-evident. `event_hash` chains over the previous event's
hash, so any edit breaks the chain. Triggers reject UPDATE and DELETE
outright. The subject can read and export every event about them, including
each actual read Gabriel performs (`financial_read` events carry the grant id
used). Break-glass access is recorded here and alerted to the subject.

### `public.oversight_alerts`

Every coverage lifecycle alert (expiring, revoked, review due, majority
reached, relationship suspension, exploitation flag) is written for both
sides, subject and grantee. An exploitation flag additionally goes to the
subject's designated trusted contact, never exclusively to a single grantee.

### Identity bridge honesty

Most person nodes on a tree do not have their own EverAfter login. For those
people, consent is captured at grant time with a recorded
`verification_method` by the household steward, and their coverage facts are
visible on their node and in every attestation. When the person accepts an
invitation from their own account, `subject_user_id` binds, and from then on
the watcher list, instant revoke, and audit export work from their own login
at every plan tier. Nothing in this model lets any role hide the watcher
list from a subject who can sign in.

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
