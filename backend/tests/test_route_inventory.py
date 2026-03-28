from pathlib import Path
import re

from app.services.runtime_readiness import ROUTE_DEFINITIONS


def test_runtime_route_inventory_covers_app_routes():
    app_tsx = Path(__file__).resolve().parents[2] / "src" / "App.tsx"
    app_source = app_tsx.read_text(encoding="utf-8")

    route_paths = set(re.findall(r'path="([^"]+)"', app_source))
    inventory_paths = {entry["path"] for entry in ROUTE_DEFINITIONS}

    missing = sorted(route_paths - inventory_paths)
    assert missing == [], f"Route inventory is missing App.tsx paths: {missing}"
