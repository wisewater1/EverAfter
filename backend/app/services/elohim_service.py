"""Elohim service — anchor EverAfter souls, memories, and family bonds into a
signed, post-quantum ledger.

[Elohim](https://github.com/wisewater1/Elohim) is a sovereign, append-only
blockchain of "digital souls": every act is Ed25519 + ML-DSA (post-quantum)
signed and content-addressed, and ``verify`` proves the whole ledger is
untampered. Provide the CLI via ``ELOHIM_BIN``, or clone the (private) repo at
``vendor/elohim`` — it is intentionally not a git submodule, so that public
deploys (Netlify/Render) can clone this repository unauthenticated.

This is EverAfter's "no ghosts with landlords" permanence layer: if everafterai.net
ever disappears, the souls — and their memories and family bonds — remain,
cryptographically intact and independently verifiable, owned by the family.

Mapping (covers both everafterai.net and the St Joseph / genealogy quadrant):
    Engram                -> a soul        (inscribe, once)
    EngramDailyResponse   -> a memory      (remember)
    FamilyRelationship    -> a bond        (bond)  ← St Joseph quadrant

Mechanism is the vendored CLI (one-time ``crystal build``); see
``app.workers.elohim_anchor`` for the batch, single-writer anchor job. The CLI is
single-writer — never append to one ledger from concurrent processes.

Env:
    ELOHIM_LEDGER   path to the ledger JSON (required to anchor)
    ELOHIM_BIN      prebuilt ``elohim`` binary (else vendor/elohim/elohim)
    ELOHIM_KEEPER   signer name (default "everafter")
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from typing import Dict, Optional

_ANSI = re.compile(r"\x1b\[[0-9;]*m")
_SIGIL = re.compile(r"\b([0-9a-f]{16})\b")
_VENDOR = Path(__file__).resolve().parents[3] / "vendor" / "elohim"


class ElohimError(RuntimeError):
    pass


class ElohimService:
    def __init__(
        self,
        ledger_path: Optional[str] = None,
        binary: Optional[str] = None,
        keeper: Optional[str] = None,
    ) -> None:
        self.ledger_path = ledger_path or os.environ.get("ELOHIM_LEDGER", "")
        self._binary = binary or os.environ.get("ELOHIM_BIN", "")
        self.keeper = keeper or os.environ.get("ELOHIM_KEEPER", "everafter")
        self._map_path = Path(f"{self.ledger_path}.subjects.json") if self.ledger_path else None
        self._subjects: Dict[str, str] = {}

    # ----- lifecycle ----------------------------------------------------------
    def connect(self) -> "ElohimService":
        if not self.ledger_path:
            raise ElohimError("ELOHIM_LEDGER (ledger path) is required.")
        self._resolve_binary()
        if not Path(self.ledger_path).exists():
            self._run("init")
        if self._map_path and self._map_path.exists():
            import json

            self._subjects = json.loads(self._map_path.read_text() or "{}")
        return self

    # ----- acts ---------------------------------------------------------------
    def ensure_soul(self, ref: str, name: str, essence: str = "An EverAfter soul") -> str:
        """Inscribe (once) a soul for a stable ref (e.g. an engram id); return its sigil."""
        if ref in self._subjects:
            return self._subjects[ref]
        out = self._run("inscribe", "--name", name or ref, "--essence", essence,
                        "--born", "", "--keeper", self.keeper)
        m = _SIGIL.search(_ANSI.sub("", out)) or _SIGIL.search(_ANSI.sub("", self._run("souls", check=False)))
        if not m:
            raise ElohimError(f"could not resolve soul id for {ref!r}")
        soul_id = m.group(1)
        self._subjects[ref] = soul_id
        self._flush_map()
        return soul_id

    def remember(self, soul_id: str, title: str, body: str, by: str = "everafter",
                 emotion: str = "") -> None:
        args = ["remember", soul_id, "--title", (title or "memory")[:120], "--body", body or ""]
        if emotion:
            args += ["--emotion", emotion]
        if by:
            args += ["--by", by]
        self._run(*args)

    def bond(self, soul_id: str, name: str, relation: str, note: str = "") -> None:
        args = ["bond", soul_id, "--name", name or "kin", "--relation", relation or "relative"]
        if note:
            args += ["--note", note]
        self._run(*args)

    def verify(self) -> bool:
        return "intact" in self._run("verify", check=False).lower()

    # ----- internals ----------------------------------------------------------
    def _resolve_binary(self) -> None:
        if self._binary and Path(self._binary).exists():
            return
        built = _VENDOR / "elohim"
        if built.exists():
            self._binary = str(built)
            return
        from shutil import which

        crystal = which("crystal")
        if not crystal:
            raise ElohimError(
                "No elohim binary and Crystal not installed. Set ELOHIM_BIN, or "
                "`cd vendor/elohim && crystal build src/elohim.cr -o elohim`."
            )
        subprocess.run([crystal, "build", "src/elohim.cr", "-o", "elohim"],
                       cwd=str(_VENDOR), check=True, capture_output=True)
        self._binary = str(built)

    def _flush_map(self) -> None:
        if self._map_path is not None:
            import json

            self._map_path.write_text(json.dumps(self._subjects, indent=2))

    def _run(self, *args: str, check: bool = True) -> str:
        proc = subprocess.run(
            [self._binary, "--chain", self.ledger_path, "--as", self.keeper, *args],
            capture_output=True, text=True,
        )
        if check and proc.returncode != 0:
            raise ElohimError(
                f"elohim {' '.join(args[:2])} failed ({proc.returncode}): "
                f"{(proc.stderr or proc.stdout).strip()[:300]}"
            )
        return proc.stdout
