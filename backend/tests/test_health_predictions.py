import pytest

from app.api.health import get_health_predictions
from app.models.health_prediction_runtime import DelphiTrajectory
from app.services.health_prediction_runtime_tables import HEALTH_PREDICTION_RUNTIME_TABLES
from app.services.shared_health_predictor import SharedHealthPredictor, shared_predictor


def test_shared_predictor_singleton_is_exported():
    assert isinstance(shared_predictor, SharedHealthPredictor)


def test_delphi_trajectory_table_is_bootstrapped():
    assert DelphiTrajectory.__table__ in HEALTH_PREDICTION_RUNTIME_TABLES


@pytest.mark.asyncio
async def test_shared_predictor_family_prediction_returns_member_bundle():
    result = await shared_predictor.predict_family(
        user_id="user-1",
        family_members=[
            {
                "id": "member-1",
                "firstName": "Alice",
                "lastName": "Example",
                "traits": ["stress"],
                "generation": 0,
                "birthYear": 1990,
            }
        ],
        consent_map={"member-1": True},
    )

    assert result["aggregate_risk"] in {"low", "moderate", "high", "critical"}
    assert len(result["member_predictions"]) == 1
    member_prediction = result["member_predictions"][0]
    assert member_prediction["consent_granted"] is True
    assert member_prediction["prediction"]["risk_level"] in {"low", "moderate", "high", "critical"}


@pytest.mark.asyncio
async def test_health_predictions_endpoint_returns_truthful_empty_state(monkeypatch):
    async def fake_fetch_metric_rows(_session, _user_id, *, since=None):
        return []

    monkeypatch.setattr("app.api.health.fetch_metric_rows", fake_fetch_metric_rows)

    result = await get_health_predictions(
        lookbackDays=30,
        session=None,
        current_user={"id": "user-1"},
    )

    assert result["analysis"]["total_data_points"] == 0
    assert result["patterns"] == []
    assert result["correlations"] == []
    assert "does not have enough live health measurements" in result["insights"][0]


@pytest.mark.asyncio
async def test_health_predictions_endpoint_uses_live_metrics_without_simulation(monkeypatch):
    rows = [
        {"metric_type": "heart_rate", "metric_value": 72.0, "metric_unit": "bpm", "recorded_at": None, "source": "manual"},
        {"metric_type": "heart_rate", "metric_value": 75.0, "metric_unit": "bpm", "recorded_at": None, "source": "manual"},
        {"metric_type": "heart_rate", "metric_value": 78.0, "metric_unit": "bpm", "recorded_at": None, "source": "manual"},
        {"metric_type": "glucose", "metric_value": 95.0, "metric_unit": "mg/dL", "recorded_at": None, "source": "manual"},
        {"metric_type": "glucose", "metric_value": 98.0, "metric_unit": "mg/dL", "recorded_at": None, "source": "manual"},
        {"metric_type": "glucose", "metric_value": 100.0, "metric_unit": "mg/dL", "recorded_at": None, "source": "manual"},
    ]

    async def fake_fetch_metric_rows(_session, _user_id, *, since=None):
        return rows

    async def fake_predict_user(_user_id, metrics_history, _profile):
        assert len(metrics_history) == len(rows)
        return {
            "condition_forecasts": [
                {
                    "lane": "cardiac",
                    "trend_direction": "stable",
                    "current_risk_level": "moderate",
                    "confidence": 82.0,
                    "score": 48.0,
                }
            ]
        }

    monkeypatch.setattr("app.api.health.fetch_metric_rows", fake_fetch_metric_rows)
    monkeypatch.setattr("app.api.health.shared_predictor.predict_user", fake_predict_user)

    result = await get_health_predictions(
        lookbackDays=30,
        session=None,
        current_user={"id": "user-1"},
    )

    assert result["analysis"]["total_data_points"] == len(rows)
    assert result["patterns"][0]["metric"] == "cardiac"
    assert result["patterns"][0]["prediction_next_7_days"]["risk_level"] == "medium"
    assert all("simulated" not in insight.lower() for insight in result["insights"])
