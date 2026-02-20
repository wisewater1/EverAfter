import asyncio
import sys
import os
from unittest.mock import AsyncMock, patch
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.council_service import council_service

async def test_council():
    print("Testing Intercession Council Deliberation...")
    
    query = "I'm feeling overwhelmed with work and my budget is tight. What should I do?"
    print(f"\nQuery: {query}")

    # Mock response
    mock_response = json.dumps({
        "transcript": [
            {"saint": "raphael", "content": "I hear your stress. You must prioritize sleep and taking breaks."},
            {"saint": "gabriel", "content": "Agreed, but we also need to look at the budget. Where are the leaks?"},
            {"saint": "michael", "content": "I can help secure your time by blocking distractions."}
        ],
        "consensus": "The Council advises a balanced approach: St. Raphael will schedule breaks, while St. Gabriel audits your expenses.",
        "action_items": ["Schedule 15min break", "Review weekly spending"]
    })
    
    # Patch the LLMClient inside council_service
    with patch.object(council_service.llm, 'generate_response', new_callable=AsyncMock) as mock_generate:
        mock_generate.return_value = mock_response
        
        try:
            result = await council_service.deliberate(query)
            
            print("\n--- Transcript ---")
            for item in result['transcript']:
                print(f"[{item['saint'].upper()}]: {item['content']}")
                
            print("\n--- Consensus ---")
            print(result['consensus'])
            
            print("\n--- Action Items ---")
            for action in result['action_items']:
                print(f"- {action}")
                
            print("\nSUCCESS: Council deliberation logic verified (with Mock LLM).")
            
        except Exception as e:
            print(f"\nFAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_council())
