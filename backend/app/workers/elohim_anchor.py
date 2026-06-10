"""Elohim anchor worker — seal EverAfter into a signed, post-quantum ledger.

Single-writer batch job (run on a schedule or by hand) that reads the database and
anchors it into Elohim, so a family's souls survive the platform:

    Engram               -> soul     (inscribe, once per engram)
    EngramDailyResponse  -> memory   (remember)           ← everafterai.net
    FamilyRelationship   -> bond     (bond)               ← St Joseph quadrant

It is incremental: a cursor sidecar (``<ledger>.cursor.json``) tracks the last
sealed ``created_at`` per kind, so re-runs only seal new rows. It is the *only*
process that should write the ledger (the Elohim CLI is single-writer).

Run once (cron) or continuously (worker dyno; still the single writer):
    DATABASE_URL=postgresql+asyncpg://... \
    ELOHIM_LEDGER=/data/everafter.ledger.json \
        python -m app.workers.elohim_anchor [--limit N] [--reset] [--loop [--interval S]]

Each seal is also recorded in the ``elohim_anchors`` Postgres table so the web
API (``GET /api/v1/elohim/anchors``) and the St Joseph UI can show sealed
status without reading the ledger files on this worker's disk.

Put the ledger on a persistent volume (not an ephemeral dyno) and back up its
keyring (``<ledger-dir>/keyring.json``, mode 0600) — it signs every act.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.services.elohim_service import ElohimService


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        try:
            from app.core.config import settings

            url = getattr(settings, "DATABASE_URL", None) or getattr(settings, "database_url", None)
        except Exception:
            url = None
    if not url:
        raise SystemExit("DATABASE_URL is required (postgresql+asyncpg://...).")
    # ensure the async driver
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    return url


def _cursor_path(ledger: str) -> Path:
    return Path(f"{ledger}.cursor.json")


def _load_cursor(ledger: str) -> Dict[str, Optional[str]]:
    p = _cursor_path(ledger)
    if p.exists():
        return json.loads(p.read_text() or "{}")
    return {"memories_after": None, "relationships_after": None}


def _save_cursor(ledger: str, cur: Dict[str, Optional[str]]) -> None:
    _cursor_path(ledger).write_text(json.dumps(cur, indent=2, default=str))


def _iso(dt) -> Optional[str]:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.astimezone(timezone.utc).isoformat()


async def run(limit: int = 0, reset: bool = False) -> int:
    # Import models lazily so importing this module never drags in the ORM.
    from sqlalchemy.dialects.postgresql import insert as pg_insert

    from app.db.session import Base
    from app.models.elohim import ElohimAnchor
    from app.models.engram import Engram, EngramDailyResponse
    from app.models.genealogy import FamilyNode, FamilyRelationship

    elohim = ElohimService().connect()
    ledger = elohim.ledger_path
    cur = {"memories_after": None, "relationships_after": None} if reset else _load_cursor(ledger)

    engine = create_async_engine(_database_url(), pool_pre_ping=True)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def record_anchor(session, ref_type: str, ref_id: str, user_id, sigil: str) -> None:
        if user_id is None:
            return  # can't scope the row to an owner; skip the status record
        stmt = pg_insert(ElohimAnchor).values(
            ref_type=ref_type, ref_id=ref_id, user_id=user_id, sigil=sigil,
        ).on_conflict_do_nothing(index_elements=["ref_type", "ref_id"])
        await session.execute(stmt)

    souls = 0
    memories = 0
    bonds = 0
    try:
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: Base.metadata.create_all(
                    sync_conn, tables=[ElohimAnchor.__table__],
                )
            )
        async with Session() as session:
            # 1) engrams -> souls (idempotent via the subject map); track a primary
            #    soul per user for attaching family bonds.
            primary_soul_by_user: Dict[str, str] = {}
            engram_user_by_id: Dict[str, object] = {}
            engrams = (await session.execute(select(Engram).order_by(Engram.created_at))).scalars().all()
            for e in engrams:
                soul_id = elohim.ensure_soul(str(e.id), name=e.name or f"Engram {e.id}")
                souls += 1
                primary_soul_by_user.setdefault(str(e.user_id), soul_id)
                engram_user_by_id[str(e.id)] = e.user_id
                await record_anchor(session, "soul", str(e.id), e.user_id, soul_id)

            # 2) responses -> memories (incremental by created_at)
            q = select(EngramDailyResponse).order_by(EngramDailyResponse.created_at)
            if cur.get("memories_after"):
                q = q.where(EngramDailyResponse.created_at > cur["memories_after"])
            if limit:
                q = q.limit(limit)
            rows = (await session.execute(q)).scalars().all()
            for r in rows:
                soul_id = elohim._subjects.get(str(r.engram_id))
                if not soul_id:
                    continue  # response for an engram we didn't inscribe
                elohim.remember(
                    soul_id,
                    title=r.question_text or "memory",
                    body=r.response_text or "",
                    emotion=getattr(r, "question_category", "") or getattr(r, "mood", "") or "",
                    by="everafter",
                )
                memories += 1
                cur["memories_after"] = _iso(r.created_at)
                await record_anchor(session, "memory", str(r.id), getattr(r, "user_id", None) or engram_user_by_id.get(str(r.engram_id)), soul_id)

            # 3) family relationships -> bonds (St Joseph / genealogy quadrant)
            try:
                nodes = (await session.execute(select(FamilyNode))).scalars().all()
                node_by_id = {n.id: n for n in nodes}
                rq = select(FamilyRelationship).order_by(FamilyRelationship.created_at)
                if cur.get("relationships_after"):
                    rq = rq.where(FamilyRelationship.created_at > cur["relationships_after"])
                if limit:
                    rq = rq.limit(limit)
                rels = (await session.execute(rq)).scalars().all()
                for rel in rels:
                    src = node_by_id.get(rel.from_node_id)
                    dst = node_by_id.get(rel.to_node_id)
                    if not src or not dst:
                        continue
                    soul_id = primary_soul_by_user.get(str(src.user_id))
                    if not soul_id:
                        continue  # this user has no engram soul to attach kin to
                    elohim.bond(
                        soul_id,
                        name=dst.name,
                        relation=rel.relation_type or "relative",
                        note=f"{src.name} → {dst.name}",
                    )
                    bonds += 1
                    cur["relationships_after"] = _iso(rel.created_at)
                    await record_anchor(session, "bond", str(rel.id), src.user_id, soul_id)
            except Exception as e:  # genealogy is optional; never fail the whole run
                print(f"[elohim] genealogy skipped: {type(e).__name__}: {e}")
            await session.commit()
    finally:
        await engine.dispose()

    ok = elohim.verify()
    _save_cursor(ledger, cur)
    print(f"souls={souls} memories+={memories} bonds+={bonds} verified={ok}")
    return 0 if ok else 1


async def run_forever(interval: float, limit: int = 0) -> None:
    """Near-real-time mode: the same single writer, on a short cadence.

    One process, one loop — creation latency becomes ~interval seconds without
    introducing a second writer against the single-writer ledger.
    """
    while True:
        try:
            await run(limit=limit)
        except SystemExit:
            raise
        except Exception as e:  # keep the worker alive across transient DB/CLI errors
            print(f"[elohim] anchor pass failed: {type(e).__name__}: {e}")
        await asyncio.sleep(interval)


def main() -> None:
    ap = argparse.ArgumentParser(description="Anchor EverAfter into the Elohim ledger.")
    ap.add_argument("--limit", type=int, default=0, help="max rows per kind this run (0 = all)")
    ap.add_argument("--reset", action="store_true", help="ignore the cursor; re-seal from the start")
    ap.add_argument("--loop", action="store_true", help="run continuously (near-real-time anchoring)")
    ap.add_argument("--interval", type=float, default=20.0, help="seconds between passes in --loop mode")
    args = ap.parse_args()
    if args.loop:
        if args.reset:
            raise SystemExit(asyncio.run(run(limit=args.limit, reset=True)))
        asyncio.run(run_forever(interval=max(args.interval, 5.0), limit=args.limit))
        return
    raise SystemExit(asyncio.run(run(limit=args.limit, reset=args.reset)))


if __name__ == "__main__":
    main()
