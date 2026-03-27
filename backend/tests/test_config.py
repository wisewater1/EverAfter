from app.core.config import _normalize_database_url


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
