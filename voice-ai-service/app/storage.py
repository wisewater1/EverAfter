from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings


class JobStore:
    def __init__(self) -> None:
        self.root = Path(settings.VOICE_AI_JOB_STORAGE_DIR)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, job_ref: str) -> Path:
        return self.root / f"{job_ref}.json"

    def save(self, job_ref: str, payload: Dict[str, Any]) -> None:
        self._path(job_ref).write_text(json.dumps(payload), encoding="utf-8")

    def load(self, job_ref: str) -> Optional[Dict[str, Any]]:
        target = self._path(job_ref)
        if not target.exists():
            return None
        return json.loads(target.read_text(encoding="utf-8"))


job_store = JobStore()
