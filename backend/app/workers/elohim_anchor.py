"""Elohim anchor worker — seal EverAfter into a signed, post-quantum ledger.

Single-writer batch job (run on a schedule or by hand) that reads the database and
anchors it into Elohim, so a family's souls survive the platform:

    Engram               -> soul     (inscribe, once per engram)
    EngramDailyResponse  -> memory   (remember)           ← everafterai.net
    FamilyRelationship   -> bond     (bond)               ← St Joseph quadrant

It is incremental: a cursor sidecar (``<ledger>.cursor.json``) tracks the last
sealed ``created_at`` per kind, so re-runs only seal new rows. It is the *only*
process that should write the ledger (the Elohim CLI is single-writer).

Run:
    DATABASE_URL=postgresql+asyncpg://... \
    ELOHIM_LEDGER=/data/everafter.ledger.json \
        python -m app.workers.elohim_anchor [--limit N] [--reset]

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
    from app.models.engram import Engram, EngramDailyResponse
    from app.models.genealogy import FamilyNode, FamilyRelationship

    elohim = ElohimService().connect()
    ledger = elohim.ledger_path
    cur = {"memories_after": None, "relationships_after": None} if reset else _load_cursor(ledger)

    engine = create_async_engine(_database_url(), pool_pre_ping=True)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    souls = 0
    memories = 0
    bonds = 0
    try:
        async with Session() as session:
            # 1) engrams -> souls (idempotent via the subject map); track a primary
            #    soul per user for attaching family bonds.
            primary_soul_by_user: Dict[str, str] = {}
            engrams = (await session.execute(select(Engram).order_by(Engram.created_at))).scalars().all()
            for e in engrams:
                soul_id = elohim.ensure_soul(str(e.id), name=e.name or f"Engram {e.id}")
                souls += 1
                primary_soul_by_user.setdefault(str(e.user_id), soul_id)

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
            except Exception as e:  # genealogy is optional; never fail the whole run
                print(f"[elohim] genealogy skipped: {type(e).__name__}: {e}")
    finally:
        await engine.dispose()

    ok = elohim.verify()
    _save_cursor(ledger, cur)
    print(f"souls={souls} memories+={memories} bonds+={bonds} verified={ok}")
    return 0 if ok else 1


def main() -> None:
    ap = argparse.ArgumentParser(description="Anchor EverAfter into the Elohim ledger.")
    ap.add_argument("--limit", type=int, default=0, help="max rows per kind this run (0 = all)")
    ap.add_argument("--reset", action="store_true", help="ignore the cursor; re-seal from the start")
    args = ap.parse_args()
    raise SystemExit(asyncio.run(run(limit=args.limit, reset=args.reset)))


if __name__ == "__main__":
    main()
