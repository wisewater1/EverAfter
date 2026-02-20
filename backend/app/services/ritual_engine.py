from typing import List, Dict, Any, Optional
from app.ai.llm_client import get_llm_client
from app.services.saint_agent_service import saint_agent_service

class RitualEngine:
    def __init__(self):
        self.llm = get_llm_client()

    async def generate_ritual(self, ritual_type: str, user_context: str, participants: List[str]) -> Dict[str, Any]:
        """
        Generates a scripted ritual/ceremony involving multiple saints.
        
        Args:
            ritual_type: "morning_prayer", "legacy_reflection", "crisis_intercession"
            user_context: Context about the user's current state.
            participants: List of saint_ids (e.g. ["joseph", "michael"])
        
        Returns:
            Dict containing the 'title', 'description', and 'script' (list of dialogue/actions).
        """
        
        saint_personas = []
        for pid in participants:
            defi = saint_agent_service.get_saint_definition(pid)
            if defi:
                saint_personas.append(f"- {defi['name']} ({defi['title']}): {defi['domain']}")

        prompt = f"""
        Design a brief, meaningful digital ritual for the user.
        
        Type: {ritual_type.replace('_', ' ').title()}
        Context: {user_context}
        
        Participants:
        {chr(10).join(saint_personas)}
        
        Format the output as a JSON object with:
        - "title": A poetic title for the ritual.
        - "description": A brief explanation of its purpose.
        - "steps": A list of objects, each with:
            - "actor": "system" (for narrator) or saint_id (e.g. "joseph").
            - "action": What they do (e.g. "Lights a candle", " Bows head").
            - "dialogue": What they say (optional).
            
        Keep it spiritual, dignified, and aligned with the "Digital Soul" aesthetic.
        """
        
        try:
            response = await self.llm.generate_response([{"role": "user", "content": prompt}])
            # Clean markdown
            cleaned = response.replace("```json", "").replace("```", "").strip()
            import json
            return json.loads(cleaned)
        except Exception as e:
            print(f"Ritual generation failed: {e}")
            return {
                "title": "Silent Reflection",
                "description": "A moment of silence.",
                "steps": [
                    {"actor": "system", "action": "The digital altar dims.", "dialogue": "Let us pause in silence."}
                ]
            }

ritual_engine = RitualEngine()
