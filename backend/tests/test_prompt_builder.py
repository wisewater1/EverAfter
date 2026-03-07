import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from app.ai.prompt_builder import PromptBuilder
from app.models.engram import Engram, EngramPersonalityFilter, EngramDailyResponse

@pytest.fixture
def mock_session():
    # Create a mock async session
    session = AsyncMock()
    return session

@pytest.mark.asyncio
async def test_build_engram_system_prompt_not_found(mock_session):
    builder = PromptBuilder()
    
    # Mock session.execute to return no engram
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result
    
    prompt = await builder.build_engram_system_prompt(mock_session, "fake_id")
    assert prompt == "You are a helpful AI assistant."

@pytest.mark.asyncio
async def test_build_engram_system_prompt_raphael(mock_session):
    builder = PromptBuilder()
    
    # Mock data
    engram = Engram(id="fake_id", name="St. Raphael", archetype="Healer", description="A compassionate guide")
    
    # Mock the execute side effects
    def execute_side_effect(*args, **kwargs):
        mock_res = MagicMock()
        
        query_str = str(args[0]).lower()
        if "from engrams" in query_str or "engram.id" in query_str or "engram " in query_str:
            mock_res.scalar_one_or_none.return_value = engram
        elif "engram_personality_filters" in query_str or "engrampersonalityfilter" in query_str:
            mock_res.scalars.return_value.all.return_value = []
        elif "engram_daily_responses" in query_str or "engramdailyresponse" in query_str:
            mock_res.scalars.return_value.all.return_value = []
        elif "engram_assets" in query_str or "engramasset" in query_str:
            mock_res.scalars.return_value.all.return_value = []
        else:
            # Fallback
            mock_res.scalar_one_or_none.return_value = None
            mock_res.scalars.return_value.all.return_value = []
            
        return mock_res
        
    mock_session.execute.side_effect = execute_side_effect
    
    # Mock the sub-method calls so they don't do complex DB ops
    builder.build_health_prediction_context = AsyncMock(return_value="INSIGHTS FROM DELPHI: Health is optimal.")
    builder.get_engram_assets_context = AsyncMock(return_value="")
    
    prompt = await builder.build_engram_system_prompt(mock_session, "fake_id")
    
    # Validate Raphael's specific injections
    assert "You are an AI representation of St. Raphael, their Healer" in prompt
    assert "SPECIAL MISSION: HEALTH & WELL-BEING" in prompt
    assert "INSIGHTS FROM DELPHI: Health is optimal." in prompt
