import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from app.services.causal_twin.counterfactual_engine import CounterfactualEngine

@pytest.mark.asyncio
async def test_simulate_scenarios_basic():
    engine = CounterfactualEngine()
    
    # Mock the LLM call to return a static string instead of hitting OpenAI
    engine.llm.generate_response = AsyncMock(return_value="Mocked LLM narrative.")

    with patch.object(engine, '_get_user_baselines', new_callable=AsyncMock) as mock_baselines, \
         patch.object(engine, '_assess_history_stats', new_callable=AsyncMock) as mock_stats:

        mock_baselines.return_value = {
            "resting_hr": {"mean": 70.0, "std": 5.0, "unit": "bpm"},
            "hrv": {"mean": 45.0, "std": 12.0, "unit": "ms"},
            "steps": {"mean": 5000.0, "std": 1000.0, "unit": "steps"},
            "sleep_quality": {"mean": 72.0, "std": 8.0, "unit": "%"},
        }
        mock_stats.return_value = {"history_days": 21, "completeness": 0.8}

        behavior_changes = {
            "sleep_hours": 8.5,
            "steps": 9000
        }

        result = await engine.simulate_scenarios(
            user_id="test-123",
            behavior_changes=behavior_changes,
            horizons=[7, 30]
        )
    
        # Check structure
        assert "projections" in result
        assert "narrative" in result
        assert "composite_indices" in result
        assert "downstream_equations" in result
        assert "behavior_deltas" in result
    
        # sleep_hours affects resting_hr, hrv, etc.
        assert "resting_hr" in result["projections"]
        assert "hrv" in result["projections"]
    
        # Check horizons
        assert "7d" in result["projections"]["resting_hr"]
        assert "30d" in result["projections"]["resting_hr"]
    
        # Steps should also factor into resting_hr
        assert "contributing_behaviors" in result["projections"]["resting_hr"]["30d"]
        contributors = result["projections"]["resting_hr"]["30d"]["contributing_behaviors"]
        assert "sleep_hours" in contributors
        assert "steps" in contributors
        assert "7d" in result["composite_indices"]
        assert "trajectory_lift" in result["downstream_equations"]
    
        assert result["narrative"] == "Mocked LLM narrative."
