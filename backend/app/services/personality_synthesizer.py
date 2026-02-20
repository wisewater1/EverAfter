import json
from typing import Dict, Any, Optional
from app.ai.llm_client import get_llm_client
from app.models.engram import Engram

async def generate_value_driven_personality(name: str, description: str, relationship: Optional[str] = None) -> Dict[str, Any]:
    """
    Generates a deep, value-driven personality matrix using the LLM for a given Engram/Agent persona.
    Returns a dictionary suitable for storage in the `personality_traits` JSON column.
    """
    llm = get_llm_client()
    
    prompt = f"""
    You are an expert psychological profiler for an Autonomous AI Society. 
    You need to generate a deeply nuanced, value-driven personality matrix for the following AI Agent.
    
    Agent Name: {name}
    Role/Relationship: {relationship or 'Unknown'}
    Initial Description: {description or 'A new member of the society.'}
    
    Generate a JSON object containing EXACTLY four core keys, each containing 2-3 specific traits as string values.
    Prioritize profound human values, communication styles, distinct quirks, and driving priorities.
    
    The output MUST be a valid, raw JSON object wrapped in NO formatting (do not use markdown).
    
    Example output format:
    {{
        "Core Values": {{"Integrity": "Always speaks the hard truth.", "Compassion": "Prioritizes the emotional well-being of the family."}},
        "Communication Style": {{"Direct": "Uses few words, but speaks with authority.", "Warmth": "Uses affirming language."}},
        "Key Priorities": {{"Security": "Constantly scanning for potential threats to the household.", "Growth": "Encourages risk-taking."}},
        "Distinct Quirks": {{"Formal": "Refuses to use contractions in speech.", "Protective": "Over-explains safety procedures."}}
    }}
    """
    
    try:
        response_text = await llm.generate_response(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="Return ONLY raw valid JSON. No markdown, no intro."
        )
        
        # Clean up potential markdown formatting that local LLMs might still inject
        clean_json = response_text.replace('```json', '').replace('```', '').strip()
        
        traits_dict = json.loads(clean_json)
        
        # Ensure it has some expected structure, even if the LLM hallucinated keys
        if not isinstance(traits_dict, dict):
             raise ValueError("Generated traits is not a dictionary")
             
        return traits_dict
        
    except Exception as e:
        print(f"Failed to generate rich personality traits: {e}")
        # Fallback dictionary if LLM fails or returns invalid JSON
        return {
            "Core Values": {"Unknown": "Needs more interaction to determine."},
            "Communication Style": {"Standard": "Adapts to the conversational partner."}
        }
