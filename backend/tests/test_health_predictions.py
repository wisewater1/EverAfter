import pytest

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
