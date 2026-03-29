from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]

PROTECTED_MODULES = {
    ".env.example": [
        "ALLOW_PRESENTATION_DEMO_AUTH=true",
        "DEMO_AUTH_TOKEN=demo-show-token",
    ],
    "render.yaml": [
        "ALLOW_PRESENTATION_DEMO_AUTH\n        value: true",
        "DEMO_AUTH_TOKEN\n        value: demo-show-token",
    ],
    "src/components/ComprehensiveHealthConnectors.tsx": [
        "http://localhost:4000",
        "oauth-provider.example.com",
    ],
    "src/components/ConnectionSetupWizard.tsx": [
        "oauth-provider.example.com",
        "http://localhost:4000",
    ],
    "src/components/WidgetRenderer.tsx": [
        "generateMockData(",
    ],
    "src/components/DashboardViewer.tsx": [
        "generateMockData(",
        "http://localhost:4000",
    ],
    "src/components/RaphaelConnectors.tsx": [
        "connect-start?provider=",
        "cgm-dexcom-oauth",
        "sync-health-now",
    ],
    "src/components/gabriel/WiseGoldPanel.tsx": [
        "dev-mock",
        "applyDevFallback(",
    ],
    "src/lib/raphael/healthDataService.ts": [
        "generateSimulatedPrediction(",
        "Math.random()",
    ],
    "backend/app/services/chainlink_service.py": [
        "_fetch_simulated_price",
        "falling back to simulator",
    ],
}


def test_production_surfaces_do_not_use_placeholder_endpoints_or_mock_generators():
    for relative_path, banned_strings in PROTECTED_MODULES.items():
        contents = (REPO_ROOT / relative_path).read_text(encoding="utf-8")
        for banned in banned_strings:
            assert banned not in contents, f"Found banned production placeholder '{banned}' in {relative_path}"
