# Elohim integration — sovereign permanence for souls, memories & family bonds

[Elohim](https://github.com/wisewater1/Elohim) is expected at `vendor/elohim`
(clone it there; see below) and gives EverAfter a **signed, post-quantum,
tamper-evident ledger**.
It is the "no ghosts with landlords" layer: if **everafterai.net** ever goes away,
the souls — their memories and family bonds — remain, cryptographically intact and
independently verifiable, owned by the family.

Every act is Ed25519 + ML-DSA (post-quantum) signed and content-addressed;
`elohim verify` proves the whole ledger is untampered.

## Mapping

| EverAfter (Postgres)   | Elohim act | Covers |
|------------------------|------------|--------|
| `Engram`               | soul (inscribe) | the persona |
| `EngramDailyResponse`  | memory (remember) | everafterai.net memories |
| `FamilyRelationship`   | bond (bond) | **St Joseph / genealogy quadrant** |

## How it runs — a single-writer anchor worker (not inline)

EverAfter's API runs on ephemeral Render instances and is request-hot, so we do
**not** seal inline on the request path (a per-request subprocess would race the
single-writer ledger and wouldn't persist). Instead, a batch worker reads the DB
and anchors new rows incrementally:

```bash
git clone https://github.com/wisewater1/Elohim vendor/elohim         # private; needs auth
cd vendor/elohim && crystal build src/elohim.cr -o elohim && cd -    # one-time

DATABASE_URL=postgresql+asyncpg://...  \
ELOHIM_LEDGER=/data/everafter.ledger.json \
  python -m app.workers.elohim_anchor            # run on a schedule (cron/worker)
```

- Incremental via a cursor sidecar (`<ledger>.cursor.json`); re-runs only seal new
  rows. `--reset` re-seals from the start; `--limit N` caps rows per kind.
- The worker is the **only** writer — never anchor the same ledger from two
  processes at once.

## Production go-live (Render) — checklist

The repo declares everything (`render.yaml`: worker `everafter-elohim-anchor`,
Docker build `backend/Dockerfile.elohim`, persistent disk at `/data`). To turn
it on:

1. **Fix the backend env first** (the worker reads the same Postgres):
   `DATABASE_URL` current (Supabase → Connect, pooler string) and
   `SUPABASE_JWT_SECRET` set on `everafter-api`; restart it.
2. **Sync the Blueprint** (Render dashboard → Blueprints → sync this repo) so
   the new worker + disk are created. Persistent disks need a paid instance.
3. **Set the worker's secrets**: `DATABASE_URL` (same as the API) and
   `ELOHIM_REPO_TOKEN` — a fine-grained GitHub token, read-only Contents
   access, scoped to `wisewater1/Elohim` only (used at image build to compile
   the CLI; rotate freely).
4. Deploy. First pass back-fills: every existing engram is inscribed as a
   soul, responses become memories, St Joseph relationships become bonds.
   Each seal is recorded in the `elohim_anchors` table.
5. **See it**: relatives in the St Joseph tab show a "Sealed" badge
   (via `GET /api/v1/elohim/anchors`); worker logs print
   `souls=… memories+=… bonds+=… verified=True` every pass.
6. **Back up the keyring** (`/data/keyring.json`) once created — losing it
   means the ledger can never be extended as that keeper.

## Verify / audit

```bash
elohim --chain "$ELOHIM_LEDGER" verify                # whole-ledger integrity
elohim --chain "$ELOHIM_LEDGER" souls                 # one soul per engram
elohim --chain "$ELOHIM_LEDGER" provenance <soul>     # memories + bonds, each signed
```

## Programmatic use

```python
from app.services.elohim_service import ElohimService

e = ElohimService().connect()                  # reads ELOHIM_LEDGER / ELOHIM_BIN / ELOHIM_KEEPER
soul = e.ensure_soul("engram-uuid", name="Rosa Avila")
e.remember(soul, title="The kitchen", body="Bread and cardamom.")
e.bond(soul, name="Marisol", relation="daughter")   # St Joseph genealogy
assert e.verify()
```

## Operational notes

- **Persistence.** Put the ledger on a durable volume, not an ephemeral dyno.
- **Keeper key.** Acts are signed by `ELOHIM_KEEPER` whose key lives in the ledger's
  keyring (`<ledger-dir>/keyring.json`, mode 0600). Back it up — losing it means you
  can no longer extend the ledger as that keeper.
- **Privacy.** Memories carry the user's own answer text (that is the point —
  preserving them). Scope the ledger volume and keyring like any PII store, and only
  anchor engrams whose owners have consented to permanence.
- `wisewater1/Elohim` is **private**; cloning it needs auth. It is deliberately
  *not* a git submodule: EverAfter is public, and a private submodule makes every
  unauthenticated clone fail (it broke Netlify deploys at "preparing repo").
  Deploys don't need it — the anchor worker is opt-in via `ELOHIM_BIN`/`ELOHIM_LEDGER`.
