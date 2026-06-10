# Elohim integration — sovereign permanence for souls, memories & family bonds

[Elohim](https://github.com/wisewater1/Elohim) is vendored at `vendor/elohim` (git
submodule) and gives EverAfter a **signed, post-quantum, tamper-evident ledger**.
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
git submodule update --init --recursive
cd vendor/elohim && crystal build src/elohim.cr -o elohim && cd -    # one-time

DATABASE_URL=postgresql+asyncpg://...  \
ELOHIM_LEDGER=/data/everafter.ledger.json \
  python -m app.workers.elohim_anchor            # run on a schedule (cron/worker)
```

- Incremental via a cursor sidecar (`<ledger>.cursor.json`); re-runs only seal new
  rows. `--reset` re-seals from the start; `--limit N` caps rows per kind.
- The worker is the **only** writer — never anchor the same ledger from two
  processes at once.

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
- The submodule is the **private** `wisewater1/Elohim`; fetching it needs auth.
