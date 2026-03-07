import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from app.services.causal_twin.counterfactual_engine import CounterfactualEngine

@pytest.mark.asyncio
async def test_simulate_scenarios_basic():
    engine = CounterfactualEngine()
    
    # Mock the LLM call to return a static string instead of hitting OpenAI
    engine.llm.generate_response = AsyncMock(return_value="Mocked LLM narrative.")
    
    # Simulate adding 1.5 hours of sleep and 2000 steps
    behavior_changes = {
        "sleep_hours": 1.5,
        "steps": 2000
    }
    
    result = await engine.simulate_scenarios(
        user_id="test-123",
        behavior_changes=behavior_changes,
        horizons=[7, 30]
    )
    
    # Check structure
    assert "projections" in result
    assert "narrative" in result
    
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
    
    assert result["narrative"] == "Mocked LLM narrative."
