from datetime import datetime

import pytest

from app.services import health_widgets


@pytest.mark.asyncio
async def test_resolve_widget_payloads_returns_live_and_planned_states(monkeypatch):
    rows = [
        {
            "metric_type": "glucose",
            "metric_value": 112.0,
            "metric_unit": "mg/dL",
            "recorded_at": datetime(2026, 3, 28, 8, 0, 0),
            "source": "dexcom_cgm",
        },
        {
            "metric_type": "steps",
            "metric_value": 8421.0,
            "metric_unit": "steps",
            "recorded_at": datetime(2026, 3, 28, 18, 0, 0),
            "source": "fitbit",
        },
    ]

    async def fake_fetch_metric_rows(_session, _user_id, *, since=None):
        return rows

    monkeypatch.setattr(health_widgets, "fetch_metric_rows", fake_fetch_metric_rows)

    payloads = await health_widgets.resolve_widget_payloads(
        None,
        "user-1",
        [
          {"id": "w-live", "widget_type": "metric_gauge", "config": {"metric": "steps"}, "data_sources": []},
          {"id": "w-planned", "widget_type": "training_load", "config": {}, "data_sources": []},
        ],
    )

    assert payloads["w-live"]["status"] == "ready"
    assert payloads["w-live"]["data"]["value"] == 8421.0
    assert payloads["w-planned"]["status"] == "planned"
    assert "planned" in payloads["w-planned"]["error"].lower()


def test_build_summary_from_rows_uses_real_metric_rows():
    rows = [
        {
            "metric_type": "sleep_duration",
            "metric_value": 7.5,
            "metric_unit": "hrs",
            "recorded_at": datetime(2026, 3, 28, 7, 0, 0),
            "source": "oura",
        },
        {
            "metric_type": "steps",
            "metric_value": 10050.0,
            "metric_unit": "steps",
            "recorded_at": datetime(2026, 3, 28, 18, 0, 0),
            "source": "fitbit",
        },
    ]

    summary = health_widgets.build_summary_from_rows(rows)

    assert summary["metrics"] == 2
    assert summary["activity_score"] is not None
    assert "steps" in summary["sources"]
