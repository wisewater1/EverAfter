from app.core.config import _expand_loopback_origins, _normalize_database_url


def test_preserves_supabase_pooler_url_by_default():
    raw = "postgresql://postgres.sncvecvgxwkkxnxbvglv:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    normalized = _normalize_database_url(raw, "https://sncvecvgxwkkxnxbvglv.supabase.co")

    assert normalized == "postgresql+asyncpg://postgres.sncvecvgxwkkxnxbvglv:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres"


def test_can_force_direct_supabase_host_when_requested():
    raw = "postgresql://postgres.sncvecvgxwkkxnxbvglv:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    normalized = _normalize_database_url(
        raw,
        "https://sncvecvgxwkkxnxbvglv.supabase.co",
        force_direct_host=True,
    )

    assert normalized == "postgresql+asyncpg://postgres:secret@db.sncvecvgxwkkxnxbvglv.supabase.co:5432/postgres"


def test_expands_localhost_and_loopback_origin_variants():
    expanded = _expand_loopback_origins(["http://localhost:5173", "http://127.0.0.1:3000"])

    assert "http://localhost:5173" in expanded
    assert "http://127.0.0.1:5173" in expanded
    assert "http://127.0.0.1:3000" in expanded
    assert "http://localhost:3000" in expanded
