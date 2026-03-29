from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, List, Mapping
from uuid import uuid4

from sqlalchemy import text

from app.db.session import create_supabase_client, get_session_factory


logger = logging.getLogger(__name__)

FHIR_IMPORT_BUCKET = "user-files"
FHIR_IMPORT_PREFIX = "health-imports"
FHIR_IMPORT_POLL_SECONDS = 5

LOINC_METRIC_MAP = {
    "8480-6": "bp_systolic",
    "8462-4": "bp_diastolic",
    "8867-4": "heart_rate",
    "29463-7": "weight",
    "3141-9": "weight",
    "39156-5": "bmi",
    "8310-5": "temperature",
    "2708-6": "spo2",
    "59408-5": "spo2",
    "9279-1": "respiration_rate",
    "2339-0": "glucose",
    "15074-8": "glucose",
    "2345-7": "glucose",
    "41653-7": "glucose",
    "4548-4": "hba1c",
    "17856-6": "hba1c",
}


@dataclass
class FhirJobCounts:
    records_extracted: int = 0
    records_imported: int = 0
    records_failed: int = 0
    normalized_metric_count: int = 0


def _json_bytes(payload: Mapping[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _storage_path(user_id: str, job_id: str) -> str:
    return f"{FHIR_IMPORT_PREFIX}/{user_id}/{job_id}.json"


def _upload_payload(storage_path: str, payload_bytes: bytes) -> None:
    client = create_supabase_client()
    client.storage.from_(FHIR_IMPORT_BUCKET).upload(
        storage_path,
        payload_bytes,
        {"content-type": "application/json", "x-upsert": "false"},
    )


def _download_payload(storage_path: str) -> Dict[str, Any]:
    client = create_supabase_client()
    raw = client.storage.from_(FHIR_IMPORT_BUCKET).download(storage_path)
    return json.loads(raw.decode("utf-8"))


def _remove_payload(storage_path: str) -> None:
    client = create_supabase_client()
    client.storage.from_(FHIR_IMPORT_BUCKET).remove([storage_path])


def _resource_identifier(resource: Mapping[str, Any]) -> str:
    return str(resource.get("id") or uuid4())


def _parse_datetime(value: Any) -> datetime | None:
    candidate = str(value or "").strip()
    if not candidate:
        return None
    try:
        return datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return None


def _safe_json(value: Any) -> str:
    return json.dumps(value or {})


def _first_coding(block: Any) -> Dict[str, Any]:
    if isinstance(block, dict):
        coding = block.get("coding") or []
        if coding:
            first = coding[0]
            if isinstance(first, dict):
                return first
    return {}


def _extract_display_text(resource: Mapping[str, Any], key: str = "code") -> str | None:
    coding = _first_coding(resource.get(key))
    return str(coding.get("display") or (resource.get(key) or {}).get("text") or "").strip() or None


def _extract_code(resource: Mapping[str, Any], key: str = "code") -> tuple[str | None, str | None]:
    coding = _first_coding(resource.get(key))
    code_system = str(coding.get("system") or "").strip() or None
    code_value = str(coding.get("code") or "").strip() or None
    return code_system, code_value


def _resource_effective_date(resource: Mapping[str, Any]) -> datetime | None:
    for key in (
        "effectiveDateTime",
        "effectiveInstant",
        "occurrenceDateTime",
        "performedDateTime",
        "authoredOn",
        "onsetDateTime",
        "recordedDate",
        "date",
        "issued",
    ):
        parsed = _parse_datetime(resource.get(key))
        if parsed is not None:
            return parsed
    billable_period = resource.get("billablePeriod") or {}
    parsed = _parse_datetime(billable_period.get("start"))
    if parsed is not None:
        return parsed
    return _parse_datetime((resource.get("meta") or {}).get("lastUpdated"))


def _resource_issued_date(resource: Mapping[str, Any]) -> datetime | None:
    return _parse_datetime(resource.get("issued") or resource.get("recordedDate") or resource.get("date"))


def _family_history_display(resource: Mapping[str, Any]) -> str | None:
    conditions = resource.get("condition") or []
    for condition in conditions:
        code = _first_coding((condition or {}).get("code"))
        display = str(code.get("display") or ((condition or {}).get("code") or {}).get("text") or "").strip()
        if display:
            return display
    relationship = _first_coding(resource.get("relationship"))
    return str(relationship.get("display") or "").strip() or None


def _clinical_record_from_resource(user_id: str, resource: Mapping[str, Any]) -> Dict[str, Any] | None:
    resource_type = str(resource.get("resourceType") or "").strip()
    resource_id = _resource_identifier(resource)
    effective_date = _resource_effective_date(resource)
    issued_date = _resource_issued_date(resource)

    if resource_type == "Observation":
        code_system, code_value = _extract_code(resource, "code")
        display_text = _extract_display_text(resource, "code")
        category = _extract_display_text({"code": (resource.get("category") or [{}])[0]}, "code") or "observation"
    elif resource_type == "Condition":
        code_system, code_value = _extract_code(resource, "code")
        display_text = _extract_display_text(resource, "code")
        category = "condition"
    elif resource_type in {"MedicationRequest", "MedicationStatement"}:
        code_system, code_value = _extract_code(resource, "medicationCodeableConcept")
        display_text = _extract_display_text(resource, "medicationCodeableConcept")
        category = "medication"
    elif resource_type == "FamilyMemberHistory":
        condition = _family_history_display(resource)
        code_system = "FHIR"
        code_value = None
        display_text = condition
        category = "family_history"
    elif resource_type == "Procedure":
        code_system, code_value = _extract_code(resource, "code")
        display_text = _extract_display_text(resource, "code")
        category = "procedure"
    elif resource_type == "DiagnosticReport":
        code_system, code_value = _extract_code(resource, "code")
        display_text = _extract_display_text(resource, "code")
        category = "laboratory"
    elif resource_type == "DocumentReference":
        code_system, code_value = _extract_code(resource, "type")
        display_text = _extract_display_text(resource, "type")
        category = "document"
    elif resource_type == "AllergyIntolerance":
        code_system, code_value = _extract_code(resource, "code")
        display_text = _extract_display_text(resource, "code")
        category = "allergy"
    elif resource_type == "Immunization":
        code_system, code_value = _extract_code(resource, "vaccineCode")
        display_text = _extract_display_text(resource, "vaccineCode")
        category = "immunization"
    else:
        return None

    return {
        "id": str(uuid4()),
        "user_id": user_id,
        "provider_key": "fhir_import",
        "source_type": "fhir",
        "source_record_id": resource_id,
        "resource_type": resource_type,
        "resource_data": resource,
        "category": category,
        "code_system": code_system,
        "code": code_value,
        "display_text": display_text,
        "effective_date": effective_date,
        "issued_date": issued_date,
        "status": str(resource.get("status") or "final"),
        "quality_flag": "verified",
        "provenance": {
            "imported_via": "api",
            "provider_key": "fhir_import",
        },
    }


def _observation_metric_rows(user_id: str, resource: Mapping[str, Any]) -> List[Dict[str, Any]]:
    if str(resource.get("resourceType") or "") != "Observation":
        return []

    rows: List[Dict[str, Any]] = []
    effective_date = _resource_effective_date(resource) or datetime.utcnow()
    code_system, code_value = _extract_code(resource, "code")

    def append_metric(metric_code: str | None, quantity: Mapping[str, Any], *, source_suffix: str = "") -> None:
        if not metric_code:
            return
        metric_type = LOINC_METRIC_MAP.get(metric_code)
        if not metric_type:
            return
        value = quantity.get("value")
        if value is None:
            return
        rows.append(
            {
                "metric_type": metric_type,
                "value": float(value),
                "unit": str(quantity.get("unit") or quantity.get("code") or ""),
                "recorded_at": effective_date,
                "source": f"fhir_import{source_suffix}",
            }
        )

    quantity = resource.get("valueQuantity")
    if isinstance(quantity, dict):
        append_metric(code_value, quantity)

    for component in resource.get("component") or []:
        component_code = _first_coding((component or {}).get("code")).get("code")
        component_quantity = (component or {}).get("valueQuantity") or {}
        if isinstance(component_quantity, dict):
            append_metric(str(component_code or ""), component_quantity, source_suffix=":component")

    return rows


async def _insert_clinical_record(session, record: Mapping[str, Any]) -> None:
    await session.execute(
        text(
            """
            INSERT INTO health_clinical_records (
              id,
              user_id,
              provider_key,
              source_type,
              source_record_id,
              resource_type,
              fhir_version,
              resource_data,
              category,
              code_system,
              code,
              display_text,
              effective_date,
              issued_date,
              status,
              quality_flag,
              provenance,
              ingestion_id,
              received_at,
              processed_at,
              created_at,
              updated_at
            ) VALUES (
              :id,
              :user_id,
              :provider_key,
              :source_type,
              :source_record_id,
              :resource_type,
              'R4',
              CAST(:resource_data AS JSONB),
              :category,
              :code_system,
              :code,
              :display_text,
              :effective_date,
              :issued_date,
              :status,
              :quality_flag,
              CAST(:provenance AS JSONB),
              :ingestion_id,
              :received_at,
              :processed_at,
              :created_at,
              :updated_at
            )
            """
        ),
        {
            "id": record["id"],
            "user_id": record["user_id"],
            "provider_key": record["provider_key"],
            "source_type": record["source_type"],
            "source_record_id": record["source_record_id"],
            "resource_type": record["resource_type"],
            "resource_data": _safe_json(record["resource_data"]),
            "category": record["category"],
            "code_system": record["code_system"],
            "code": record["code"],
            "display_text": record["display_text"],
            "effective_date": record["effective_date"],
            "issued_date": record["issued_date"],
            "status": record["status"],
            "quality_flag": record["quality_flag"],
            "provenance": _safe_json(record["provenance"]),
            "ingestion_id": str(uuid4()),
            "received_at": datetime.utcnow(),
            "processed_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
    )


async def _insert_metric_row(session, user_id: str, metric: Mapping[str, Any]) -> None:
    queries = [
        """
        INSERT INTO health_metrics (user_id, metric_type, metric_value, metric_unit, recorded_at, source)
        VALUES (:user_id, :metric_type, :value, :unit, :recorded_at, :source)
        """,
        """
        INSERT INTO health_metrics (user_id, metric_type, value, unit, recorded_at, source)
        VALUES (:user_id, :metric_type, :value, :unit, :recorded_at, :source)
        """,
    ]
    params = {
        "user_id": user_id,
        "metric_type": metric["metric_type"],
        "value": metric["value"],
        "unit": metric["unit"],
        "recorded_at": metric["recorded_at"],
        "source": metric["source"],
    }

    last_error: Exception | None = None
    for query in queries:
        try:
            await session.execute(text(query), params)
            return
        except Exception as exc:
            last_error = exc
            await session.rollback()

    if last_error:
        raise last_error


class HealthFhirImportWorker:
    async def enqueue_fhir_bundle(self, user_id: str, bundle: Mapping[str, Any]) -> Dict[str, Any]:
        payload_bytes = _json_bytes(bundle)
        job_id = str(uuid4())
        storage_path = _storage_path(user_id, job_id)
        file_hash = hashlib.sha256(payload_bytes).hexdigest()

        await asyncio.to_thread(_upload_payload, storage_path, payload_bytes)

        session_factory = get_session_factory()
        async with session_factory() as session:
            try:
                await session.execute(
                    text(
                        """
                        INSERT INTO health_file_imports (
                          id,
                          user_id,
                          file_name,
                          file_type,
                          file_size_bytes,
                          file_hash,
                          storage_path,
                          import_type,
                          status,
                          parsed_format,
                          document_type,
                          extraction_method,
                          created_at,
                          updated_at
                        ) VALUES (
                          :id,
                          :user_id,
                          :file_name,
                          :file_type,
                          :file_size_bytes,
                          :file_hash,
                          :storage_path,
                          :import_type,
                          :status,
                          :parsed_format,
                          :document_type,
                          :extraction_method,
                          :created_at,
                          :updated_at
                        )
                        """
                    ),
                    {
                        "id": job_id,
                        "user_id": user_id,
                        "file_name": f"{job_id}.json",
                        "file_type": "fhir_bundle",
                        "file_size_bytes": len(payload_bytes),
                        "file_hash": file_hash,
                        "storage_path": storage_path,
                        "import_type": "api",
                        "status": "pending",
                        "parsed_format": "fhir_bundle",
                        "document_type": "clinical_bundle",
                        "extraction_method": "structured",
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    },
                )
                await session.commit()
            except Exception:
                await session.rollback()
                await asyncio.to_thread(_remove_payload, storage_path)
                raise

        return {
            "job_id": job_id,
            "status": "pending",
            "file_import_id": job_id,
            "message": "FHIR bundle accepted for queued ingestion.",
        }

    async def get_job(self, user_id: str, job_id: str) -> Dict[str, Any] | None:
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                text(
                    """
                    SELECT
                      id,
                      user_id,
                      status,
                      records_extracted,
                      records_imported,
                      records_failed,
                      error_message,
                      error_details,
                      created_at,
                      started_at,
                      completed_at
                    FROM health_file_imports
                    WHERE id = :job_id AND user_id = :user_id
                    """
                ),
                {"job_id": job_id, "user_id": user_id},
            )
            row = result.mappings().first()
            if row is None:
                return None

            metadata = row.get("error_details") or {}
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except json.JSONDecodeError:
                    metadata = {}

            return {
                "job_id": str(row["id"]),
                "status": row["status"],
                "records_extracted": int(row.get("records_extracted") or 0),
                "records_imported": int(row.get("records_imported") or 0),
                "records_failed": int(row.get("records_failed") or 0),
                "resource_counts": metadata.get("resource_counts") or {},
                "error_message": row.get("error_message"),
                "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
                "started_at": row.get("started_at").isoformat() if row.get("started_at") else None,
                "completed_at": row.get("completed_at").isoformat() if row.get("completed_at") else None,
            }

    async def process_next_job_once(self) -> bool:
        session_factory = get_session_factory()
        async with session_factory() as session:
            result = await session.execute(
                text(
                    """
                    SELECT id, user_id, storage_path
                    FROM health_file_imports
                    WHERE status = 'pending'
                      AND file_type = 'fhir_bundle'
                      AND import_type = 'api'
                    ORDER BY created_at ASC
                    LIMIT 1
                    """
                )
            )
            row = result.mappings().first()
            if row is None:
                return False

            job_id = str(row["id"])
            user_id = str(row["user_id"])
            storage_path = str(row["storage_path"] or "")

            await session.execute(
                text(
                    """
                    UPDATE health_file_imports
                    SET status = 'processing',
                        started_at = :started_at,
                        updated_at = :updated_at
                    WHERE id = :job_id
                    """
                ),
                {
                    "job_id": job_id,
                    "started_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
            )
            await session.commit()

        counts = FhirJobCounts()
        resource_counts: Dict[str, int] = {}
        try:
            bundle = await asyncio.to_thread(_download_payload, storage_path)
            entries = bundle.get("entry") or []

            async with session_factory() as session:
                for entry in entries:
                    resource = (entry or {}).get("resource")
                    if not isinstance(resource, dict):
                        continue
                    resource_type = str(resource.get("resourceType") or "Unknown")
                    resource_counts[resource_type] = resource_counts.get(resource_type, 0) + 1
                    counts.records_extracted += 1

                    clinical_record = _clinical_record_from_resource(user_id, resource)
                    metric_rows = _observation_metric_rows(user_id, resource)

                    if clinical_record is None:
                        counts.records_failed += 1
                        continue

                    try:
                        await _insert_clinical_record(session, clinical_record)
                        for metric_row in metric_rows:
                            await _insert_metric_row(session, user_id, metric_row)
                            counts.normalized_metric_count += 1
                        counts.records_imported += 1
                    except Exception:
                        await session.rollback()
                        logger.exception("Failed to persist FHIR resource %s for job %s", resource_type, job_id)
                        counts.records_failed += 1
                    else:
                        await session.commit()

                status = "completed" if counts.records_failed == 0 else ("partial" if counts.records_imported > 0 else "failed")
                await session.execute(
                    text(
                        """
                        UPDATE health_file_imports
                        SET status = :status,
                            completed_at = :completed_at,
                            records_extracted = :records_extracted,
                            records_imported = :records_imported,
                            records_failed = :records_failed,
                            error_details = CAST(:error_details AS JSONB),
                            error_message = :error_message,
                            updated_at = :updated_at
                        WHERE id = :job_id
                        """
                    ),
                    {
                        "job_id": job_id,
                        "status": status,
                        "completed_at": datetime.utcnow(),
                        "records_extracted": counts.records_extracted,
                        "records_imported": counts.records_imported,
                        "records_failed": counts.records_failed,
                        "error_details": json.dumps(
                            {
                                "resource_counts": resource_counts,
                                "normalized_metric_count": counts.normalized_metric_count,
                            }
                        ),
                        "error_message": None if status != "failed" or counts.records_imported > 0 else "FHIR bundle did not contain any supported resources.",
                        "updated_at": datetime.utcnow(),
                    },
                )
                await session.commit()
            return True
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("FHIR import worker failed for job %s", job_id)
            async with session_factory() as session:
                await session.execute(
                    text(
                        """
                        UPDATE health_file_imports
                        SET status = 'failed',
                            completed_at = :completed_at,
                            error_message = :error_message,
                            error_details = CAST(:error_details AS JSONB),
                            updated_at = :updated_at
                        WHERE id = :job_id
                        """
                    ),
                    {
                        "job_id": job_id,
                        "completed_at": datetime.utcnow(),
                        "error_message": str(exc),
                        "error_details": json.dumps({"resource_counts": resource_counts}),
                        "updated_at": datetime.utcnow(),
                    },
                )
                await session.commit()
            return True

    async def run_forever(self) -> None:
        while True:
            try:
                processed = await self.process_next_job_once()
                if not processed:
                    await asyncio.sleep(FHIR_IMPORT_POLL_SECONDS)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("FHIR import worker loop failed")
                await asyncio.sleep(FHIR_IMPORT_POLL_SECONDS)


health_fhir_import_worker = HealthFhirImportWorker()
