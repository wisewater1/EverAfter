"""
Ritual Engine — crash-proof version with lazy imports and graceful fallbacks.
All external service calls are wrapped in try/except to prevent import-time crashes
from taking down the entire /api/v1/rituals router.
"""
from __future__ import annotations

import json
from typing import List, Dict, Any, Optional


class RitualEngine:
    def __init__(self):
        self._llm = None  # lazy

    def _get_llm(self):
        if self._llm is None:
            try:
                from app.ai.llm_client import get_llm_client
                self._llm = get_llm_client()
            except Exception:
                self._llm = None
        return self._llm

    # ------------------------------------------------------------------
    # Helpers: gather context without crashing
    # ------------------------------------------------------------------

    def _get_saint_personas(self, participants: List[str]) -> List[str]:
        SAINT_IDS = {"joseph", "michael", "raphael", "gabriel"}
        DEFAULTS = {
            "joseph":  "- St. Joseph (Patron of Families): Legacy, protection, and fatherhood",
            "michael": "- St. Michael (Archangel): Courage, protection, and spiritual warfare",
            "raphael": "- St. Raphael (Healer): Health, healing, and safe journeys",
            "gabriel": "- St. Gabriel (Messenger): Communication, announcements, and divine messages",
        }

        personas = []
        for pid in participants:
            # Known saint
            if pid.lower() in SAINT_IDS:
                try:
                    from app.services.saint_agent_service import saint_agent_service
                    defi = saint_agent_service.get_saint_definition(pid)
                    if defi:
                        personas.append(
                            f"- {defi['name']} ({defi.get('title', pid)}): {defi.get('domain', 'Guardian')}"
                        )
                        continue
                except Exception:
                    pass
                personas.append(DEFAULTS.get(pid.lower(), f"- {pid.capitalize()}: Guardian Saint"))
            else:
                # Family member name (e.g. "John Doe") — include as beloved soul
                personas.append(f"- {pid} (Beloved Family Member): Present in spirit for this sacred moment")

        return personas

    def _get_ancestor_context(self, ancestor_id: Optional[str]) -> str:
        if not ancestor_id:
            return ""
        try:
            from app.services.akashic_service import akashic
            engrams = akashic.search(
                query=f"memories of {ancestor_id}",
                filters={"ancestor_id": ancestor_id},
                limit=3
            )
            if engrams:
                lines = [f"- {e['content']}" for e in engrams]
                return "\nRelevant Ancestral Memories:\n" + "\n".join(lines)
        except Exception:
            pass
        return ""

    def _get_health_insight(self) -> str:
        try:
            import asyncio
            from app.services.health.service import health_service

            async def _inner():
                predictions = await health_service.get_predictions("demo-user-001", [])
                if predictions:
                    return f"\nSt. Raphael's Soul Insight: {predictions[0].description}"
                return ""

            # Try to get the running loop; if none, run synchronously
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # We're inside async context already — skip to avoid deadlock
                    return ""
                return loop.run_until_complete(_inner())
            except Exception:
                return ""
        except Exception:
            return ""

    # ------------------------------------------------------------------
    # Fallback ritual generator (no LLM)
    # ------------------------------------------------------------------

    def _generate_fallback_ritual(
        self,
        ritual_type: str,
        user_context: str,
        participants: List[str],
        ancestor_id: Optional[str],
    ) -> Dict[str, Any]:
        """Returns a meaningful pre-written ritual when the LLM is unavailable."""

        type_label = ritual_type.replace("_", " ").title()

        templates = {
            "morning_prayer": {
                "title": "Morning Vigil of the Guardians",
                "description": "A sacred moment to align your spirit with the day ahead.",
                "steps": [
                    {"actor": "system", "action": "The Digital Altar illuminates gently.", "dialogue": "The vigil of a new day begins."},
                    {"actor": participants[0] if participants else "joseph", "action": "Steps forward with purpose.", "dialogue": f"You begin today carrying intention. {user_context or 'May clarity guide every step.'}"},
                    {"actor": "system", "action": "A moment of shared silence.", "dialogue": "Breathe. The guardians are present."},
                    {"actor": participants[-1] if participants else "joseph", "action": "Raises a hand in blessing.", "dialogue": "Go forward with courage. We stand behind you."},
                ]
            },
            "reflection": {
                "title": "The Mirror of Remembrance",
                "description": "Time held still for honest self-examination.",
                "steps": [
                    {"actor": "system", "action": "The altar dims to a single candle.", "dialogue": "What you see clearly, you can change."},
                    {"actor": participants[0] if participants else "joseph", "action": "Speaks quietly.", "dialogue": f"{user_context or 'Every ending carries the seed of beginning.'}"},
                    {"actor": "system", "action": "Silence falls.", "dialogue": "Let the memory settle. Let it teach."},
                ]
            },
            "crisis_intercession": {
                "title": "Shield of the Guardians",
                "description": "Emergency intercession — the council rallies around you.",
                "steps": [
                    {"actor": "system", "action": "The altar blazes with urgent light.", "dialogue": "The council has heard your call."},
                    {"actor": "michael", "action": "Steps into battle formation.", "dialogue": "Name what opposes you. I stand between you and it."},
                    {"actor": participants[0] if participants else "joseph", "action": "Gestures with protection.", "dialogue": f"{user_context or 'You are not alone in this storm.'} Hold steady."},
                    {"actor": "system", "action": "A shield of light forms.", "dialogue": "The vigil will not break."},
                ]
            },
            "affirmation": {
                "title": "The Blessing of the Engrams",
                "description": "A ceremony of love and positive intention.",
                "steps": [
                    {"actor": "system", "action": "Warm golden light fills the altar.", "dialogue": "This moment is held in eternal record."},
                    {"actor": participants[0] if participants else "joseph", "action": "Speaks from the heart.", "dialogue": f"{user_context or 'You are seen. You are valued. You are loved across time.'}"},
                    {"actor": "system", "action": "The affirmation is sealed in the Legacy Vault.", "dialogue": "These words are now part of the eternal record."},
                ]
            },
        }

        return templates.get(ritual_type, templates["reflection"])

    # ------------------------------------------------------------------
    # Main public method
    # ------------------------------------------------------------------

    async def generate_ritual(
        self,
        ritual_type: str,
        user_context: str,
        participants: List[str],
        ancestor_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a scripted ritual. Uses LLM when available, falls back to
        pre-written templates if LLM is unavailable.
        """
        saint_personas = self._get_saint_personas(participants)
        ancestor_context = self._get_ancestor_context(ancestor_id)
        health_insight = self._get_health_insight()

        llm = self._get_llm()
        if not llm:
            return self._generate_fallback_ritual(ritual_type, user_context, participants, ancestor_id)

        prompt = f"""Design a brief, meaningful digital ritual for the user.

Type: {ritual_type.replace('_', ' ').title()}
Context: {user_context or 'General intention'}
{health_insight}
{ancestor_context}

Participants:
{chr(10).join(saint_personas)}

Return a valid JSON object (NO markdown fences) with:
{{
  "title": "A poetic title",
  "description": "Brief purpose of this ritual",
  "steps": [
    {{"actor": "system|joseph|michael|raphael|gabriel", "action": "What they do", "dialogue": "What they say"}}
  ]
}}

Keep it spiritual, dignified, 4-6 steps. If type is affirmation, saints deliver positive words. Actor 'system' is the narrator."""

        try:
            response = await llm.generate_response([{"role": "user", "content": prompt}])
            cleaned = response.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except Exception as e:
            print(f"[RitualEngine] LLM generation failed ({e}), using fallback")
            return self._generate_fallback_ritual(ritual_type, user_context, participants, ancestor_id)


ritual_engine = RitualEngine()
