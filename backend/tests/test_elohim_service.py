"""Offline smoke test for the Elohim service — no database required.

Exercises soul + memory + bond against a throwaway ledger and verifies it.
Skips cleanly when the vendored binary can't be built (no Crystal), so CI without
Crystal stays green. Run: `python backend/tests/test_elohim_service.py` or pytest.
"""

from __future__ import annotations

import os
import tempfile

from app.services.elohim_service import ElohimService, ElohimError


def _service_or_skip() -> ElohimService:
    os.environ["ELOHIM_LEDGER"] = os.path.join(tempfile.mkdtemp(), "everafter.ledger.json")
    try:
        return ElohimService().connect()
    except ElohimError as e:
        try:
            import pytest

            pytest.skip(f"elohim unavailable: {e}")
        except ImportError:
            print(f"SKIP: elohim unavailable: {e}")
            raise SystemExit(0)


def test_soul_memory_bond_and_verify():
    e = _service_or_skip()
    rosa = e.ensure_soul("engram-rosa", name="Rosa Avila")
    e.remember(rosa, title="The kitchen", body="Bread and cardamom.")
    e.remember(rosa, title="A lesson", body="Plant the tree you won't sit under.")
    e.bond(rosa, name="Marisol", relation="daughter", note="Rosa → Marisol")  # St Joseph quadrant

    ben = e.ensure_soul("engram-ben", name="Ben Okoro")
    assert rosa != ben
    assert e.ensure_soul("engram-rosa", name="Rosa Avila") == rosa  # idempotent
    assert e.verify()


if __name__ == "__main__":
    test_soul_memory_bond_and_verify()
    print("ok")
