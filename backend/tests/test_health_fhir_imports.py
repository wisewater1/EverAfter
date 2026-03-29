from __future__ import annotations

from datetime import datetime
from typing import Any

import pytest

from app.services.health_fhir_imports import (
    HealthFhirImportWorker,
    _clinical_record_from_resource,
    _observation_metric_rows,
)


class FakeExecuteResult:
    def __init__(self, row: dict[str, Any] | None = None):
        self._row = row

    def mappings(self):
        return self

    def first(self):
        return self._row


class FakeSession:
    def __init__(self, results: list[FakeExecuteResult] | None = None):
        self.results = results or []
        self.executed: list[tuple[Any, dict[str, Any] | None]] = []
        self.commit_count = 0
        self.rollback_count = 0

    async def execute(self, statement, params=None):
        self.executed.append((statement, params))
        if self.results:
          return self.results.pop(0)
        return FakeExecuteResult()

    async def commit(self):
        self.commit_count += 1

    async def rollback(self):
        self.rollback_count += 1


class FakeSessionContext:
    def __init__(self, session: FakeSession):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.mark.asyncio
async def test_enqueue_fhir_bundle_creates_pending_job(monkeypatch):
    uploads: list[tuple[str, bytes]] = []
    session = FakeSession()

    monkeypatch.setattr(
        "app.services.health_fhir_imports._upload_payload",
        lambda storage_path, payload_bytes: uploads.append((storage_path, payload_bytes)),
    )
    monkeypatch.setattr(
        "app.services.health_fhir_imports.get_session_factory",
        lambda: (lambda: FakeSessionContext(session)),
    )

    worker = HealthFhirImportWorker()
    response = await worker.enqueue_fhir_bundle("user-1", {"resourceType": "Bundle", "entry": []})

    assert response["status"] == "pending"
    assert response["job_id"] == response["file_import_id"]
    assert uploads and uploads[0][0].startswith("health-imports/user-1/")
    assert session.commit_count == 1
    assert "health_file_imports" in str(session.executed[0][0])


@pytest.mark.asyncio
async def test_get_job_maps_status_payload(monkeypatch):
    session = FakeSession(
        [
            FakeExecuteResult(
                {
                    "id": "job-1",
                    "user_id": "user-1",
                    "status": "completed",
                    "records_extracted": 3,
                    "records_imported": 2,
                    "records_failed": 1,
                    "error_message": None,
                    "error_details": {"resource_counts": {"Observation": 2, "Condition": 1}},
                    "created_at": datetime(2026, 3, 29, 10, 0, 0),
                    "started_at": datetime(2026, 3, 29, 10, 1, 0),
                    "completed_at": datetime(2026, 3, 29, 10, 2, 0),
                }
            )
        ]
    )

    monkeypatch.setattr(
        "app.services.health_fhir_imports.get_session_factory",
        lambda: (lambda: FakeSessionContext(session)),
    )

    worker = HealthFhirImportWorker()
    job = await worker.get_job("user-1", "job-1")

    assert job is not None
    assert job["status"] == "completed"
    assert job["records_imported"] == 2
    assert job["resource_counts"]["Observation"] == 2


def test_family_member_history_records_are_supported():
    record = _clinical_record_from_resource(
        "user-1",
        {
            "resourceType": "FamilyMemberHistory",
            "id": "family-1",
            "relationship": {"coding": [{"display": "Mother"}]},
            "condition": [
                {
                    "code": {
                        "coding": [{"display": "Hypertension"}],
                    }
                }
            ],
            "date": "2026-03-20T12:00:00Z",
        },
    )

    assert record is not None
    assert record["resource_type"] == "FamilyMemberHistory"
    assert record["category"] == "family_history"
    assert record["display_text"] == "Hypertension"


def test_observation_metric_rows_normalize_known_loinc_codes():
    rows = _observation_metric_rows(
        "user-1",
        {
            "resourceType": "Observation",
            "effectiveDateTime": "2026-03-20T12:00:00Z",
            "code": {
                "coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]
            },
            "valueQuantity": {"value": 120, "unit": "mmHg"},
            "component": [
                {
                    "code": {"coding": [{"code": "8462-4"}]},
                    "valueQuantity": {"value": 78, "unit": "mmHg"},
                }
            ],
        },
    )

    assert [row["metric_type"] for row in rows] == ["bp_systolic", "bp_diastolic"]
    assert rows[0]["value"] == 120.0
