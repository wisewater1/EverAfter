from sqlalchemy import inspect, text

from app.db.session import get_engine


HEALTH_IMPORT_TABLE_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS health_clinical_records (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      connection_id UUID NULL,
      provider_key TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'clinical',
      source_record_id TEXT NULL,
      resource_type TEXT NOT NULL,
      fhir_version TEXT DEFAULT 'R4',
      resource_data JSONB NOT NULL,
      category TEXT NULL,
      code_system TEXT NULL,
      code TEXT NULL,
      display_text TEXT NULL,
      effective_date TIMESTAMPTZ NULL,
      issued_date TIMESTAMPTZ NULL,
      encounter_id TEXT NULL,
      practitioner_id TEXT NULL,
      organization_id TEXT NULL,
      status TEXT DEFAULT 'final',
      quality_flag TEXT DEFAULT 'verified',
      provenance JSONB NULL,
      search_vector TSVECTOR NULL,
      tags TEXT[] NULL,
      ingestion_id UUID NULL,
      received_at TIMESTAMPTZ DEFAULT now(),
      processed_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS health_file_imports (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      file_hash TEXT NULL,
      storage_path TEXT NULL,
      import_type TEXT NOT NULL,
      import_source TEXT NULL,
      status TEXT DEFAULT 'pending',
      started_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL,
      records_extracted INTEGER DEFAULT 0,
      records_imported INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,
      error_message TEXT NULL,
      error_details JSONB NULL,
      ocr_performed BOOLEAN DEFAULT false,
      ocr_confidence NUMERIC NULL,
      parsed_format TEXT NULL,
      extraction_method TEXT NULL,
      extracted_date_range TSTZRANGE NULL,
      document_date TIMESTAMPTZ NULL,
      document_type TEXT NULL,
      tags TEXT[] NULL,
      requires_review BOOLEAN DEFAULT false,
      reviewed_at TIMESTAMPTZ NULL,
      reviewed_by UUID NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_health_clinical_records_user_id ON health_clinical_records(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_health_clinical_records_category ON health_clinical_records(category)",
    "CREATE INDEX IF NOT EXISTS idx_health_clinical_records_resource_type ON health_clinical_records(resource_type)",
    "CREATE INDEX IF NOT EXISTS idx_health_file_imports_status ON health_file_imports(status)",
    "CREATE INDEX IF NOT EXISTS idx_health_file_imports_user_id ON health_file_imports(user_id)",
)

HEALTH_CLINICAL_RECORD_COLUMNS = {
    "provider_key": "TEXT NOT NULL DEFAULT 'fhir_import'",
    "source_type": "TEXT NOT NULL DEFAULT 'clinical'",
    "source_record_id": "TEXT NULL",
    "resource_type": "TEXT NOT NULL DEFAULT 'DocumentReference'",
    "fhir_version": "TEXT DEFAULT 'R4'",
    "resource_data": "JSONB NOT NULL DEFAULT '{}'::jsonb",
    "category": "TEXT NULL",
    "code_system": "TEXT NULL",
    "code": "TEXT NULL",
    "display_text": "TEXT NULL",
    "effective_date": "TIMESTAMPTZ NULL",
    "issued_date": "TIMESTAMPTZ NULL",
    "status": "TEXT DEFAULT 'final'",
    "quality_flag": "TEXT DEFAULT 'verified'",
    "provenance": "JSONB NULL",
    "received_at": "TIMESTAMPTZ DEFAULT now()",
    "processed_at": "TIMESTAMPTZ DEFAULT now()",
    "updated_at": "TIMESTAMPTZ DEFAULT now()",
}

HEALTH_FILE_IMPORT_COLUMNS = {
    "file_hash": "TEXT NULL",
    "storage_path": "TEXT NULL",
    "status": "TEXT DEFAULT 'pending'",
    "started_at": "TIMESTAMPTZ NULL",
    "completed_at": "TIMESTAMPTZ NULL",
    "records_extracted": "INTEGER DEFAULT 0",
    "records_imported": "INTEGER DEFAULT 0",
    "records_failed": "INTEGER DEFAULT 0",
    "error_message": "TEXT NULL",
    "error_details": "JSONB NULL",
    "parsed_format": "TEXT NULL",
    "document_type": "TEXT NULL",
    "updated_at": "TIMESTAMPTZ DEFAULT now()",
}


def _ensure_columns(sync_conn, table_name: str, columns: dict[str, str]) -> None:
    inspector = inspect(sync_conn)
    existing_tables = set(inspector.get_table_names())
    if table_name not in existing_tables:
        return
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    for column_name, column_sql in columns.items():
        if column_name in existing_columns:
            continue
        sync_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"))


async def ensure_health_import_runtime_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        for statement in HEALTH_IMPORT_TABLE_STATEMENTS:
            await conn.execute(text(statement))
        await conn.run_sync(lambda sync_conn: _ensure_columns(sync_conn, "health_clinical_records", HEALTH_CLINICAL_RECORD_COLUMNS))
        await conn.run_sync(lambda sync_conn: _ensure_columns(sync_conn, "health_file_imports", HEALTH_FILE_IMPORT_COLUMNS))
