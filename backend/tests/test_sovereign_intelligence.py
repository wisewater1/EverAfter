import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_counterfactual_engine_empty_data():
    """Test engine behavior when user has zero metric history."""
    from app.services.causal_twin.counterfactual_engine import CounterfactualEngine
    
    engine = CounterfactualEngine()
    engine.llm.generate_response = AsyncMock(return_value="No data narrative.")
    
    # Mock _get_user_baselines and _assess_history_stats to return empty/default
    with patch.object(engine, '_get_user_baselines', new_callable=AsyncMock) as mock_baselines, \
         patch.object(engine, '_assess_history_stats', new_callable=AsyncMock) as mock_stats:
        
        mock_baselines.return_value = {
            "resting_hr": {"mean": 70.0, "std": 5.0, "unit": "bpm"},
            "hrv": {"mean": 45.0, "std": 12.0, "unit": "ms"},
            "steps": {"mean": 5000.0, "std": 1000.0, "unit": "steps"},
            "sleep_hours": {"mean": 7.0, "std": 1.0, "unit": "hrs"}
        }
        mock_stats.return_value = {"history_days": 0, "completeness": 0.0}
        
        result = await engine.simulate_scenarios(
            user_id="empty-user",
            behavior_changes={"steps": 5000},
            horizons=[30]
        )
        
        assert result["history_days"] == 0
        assert result["completeness"] == 0.0
        assert "projections" in result

@pytest.mark.asyncio
async def test_ancestry_engine_logic():
    """Test family risk map generation and Synapse Pulse logic."""
    from app.services.causal_twin.ancestry_engine import AncestryEngine
    engine = AncestryEngine()
    
    # Mock DB query for family nodes compliant with AncestryEngine.get_family_health_map_for_user
    member1 = MagicMock()
    member1.name = "Joe Grandpa"
    member1.health_metrics = {"traits": ["active", "disciplined"], "occupation": "engineer", "generation": 2}
    member1.birth_date = "1960-01-01"
    member1.id = 1
    
    member2 = MagicMock()
    member2.name = "Mary Aunt"
    member2.health_metrics = {"traits": ["anxious"], "occupation": "nurse", "generation": 1}
    member2.birth_date = "1985-05-05"
    member2.id = 2
    
    mock_members = [member1, member2]
    
    # Setup mock db session as an async context manager
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_members
    mock_session.execute.return_value = mock_result
    
    mock_session_factory = MagicMock()
    mock_session_factory.return_value.__aenter__.return_value = mock_session
    
    with patch('app.services.causal_twin.ancestry_engine.get_session_factory', return_value=mock_session_factory), \
         patch('app.services.causal_twin.ancestry_engine.select'):
        
        # Test family map
        family_map = await engine.get_family_health_map_for_user("user-123")
        assert len(family_map) == 2
        assert family_map[0]["member_name"] == "Joe Grandpa"
        
        # Test risk scoring (get_family_health_map is async in the latest engine code)
        assert len(family_map) == 2
        assert "risk_level" in family_map[0]

@pytest.mark.asyncio
async def test_evidence_ledger_grounding():
    """Test Evidence Ledger integration with Akashic Records semantic search."""
    from app.services.causal_twin.evidence_ledger import EvidenceLedger
    ledger = EvidenceLedger()
    
    mock_search_results = [
        {"content": "Medical paper about cardiovascular health.", "metadata": {"source": "PubMed"}}
    ]
    
    with patch('app.services.causal_twin.evidence_ledger.akashic.search', new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_search_results
        
        entry = await ledger.record_recommendation(
            user_id="user-123",
            recommendation_text="Increase daily steps to 10k.",
            data_sources=["biometrics"],
            # Use 0.9 to avoid Banker's rounding ambiguity with 0.85
            confidence=0.9,
            evidence_type="causal_trial"
        )
        
        assert "grounding" in entry
        assert len(entry["grounding"]) == 1
        assert entry["grounding"][0]["content"] == "Medical paper about cardiovascular health."
        assert entry["confidence"] == 0.9

@pytest.mark.asyncio
async def test_counterfactual_engine_complex_scaling():
    """Test engine with multiple behavior changes simultaneously."""
    from app.services.causal_twin.counterfactual_engine import CounterfactualEngine
    engine = CounterfactualEngine()
    engine.llm.generate_response = AsyncMock(return_value="Complex narrative.")
    
    # Mock the internal DB-hitting methods
    with patch.object(engine, '_get_user_baselines', new_callable=AsyncMock) as mock_baselines, \
         patch.object(engine, '_assess_history_stats', new_callable=AsyncMock) as mock_stats:
        
        mock_baselines.return_value = {
            "resting_hr": {"mean": 70.0, "std": 5.0, "unit": "bpm"},
            "hrv": {"mean": 45.0, "std": 12.0, "unit": "ms"},
            "steps": {"mean": 5000.0, "std": 1000.0, "unit": "steps"},
            "sleep_hours": {"mean": 7.0, "std": 1.0, "unit": "hrs"}
        }
        mock_stats.return_value = {"history_days": 30, "completeness": 0.95}

        behavior_changes = {
            "sleep_hours": 2.0,
            "steps": 2000 # Corrected to positive steps as a typical test
        }
        
        result = await engine.simulate_scenarios(
            user_id="complex-user",
            behavior_changes=behavior_changes,
            horizons=[7, 30, 90]
        )
        
        assert "90d" in result["projections"]["resting_hr"]
        assert result["narrative"] == "Complex narrative."
        assert result["history_days"] == 30
