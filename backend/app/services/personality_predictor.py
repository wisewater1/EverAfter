from typing import Dict, List, Any
# from app.models.joseph import FamilyMember  # Model pending
import re

class PersonalityPredictor:
    def __init__(self):
        # Lexicons for Big Five traits
        self.lexicons = {
            "Openness": [
                "creative", "curious", "artistic", "imaginative", "adventurous", "travel", 
                "music", "writer", "inventor", "poet", "dreamer", "explore", "learn", "new"
            ],
            "Conscientiousness": [
                "organized", "responsible", "disciplined", "hardworking", "reliable", "plan",
                "manager", "accountant", "military", "teacher", "leader", "duty", "order"
            ],
            "Extraversion": [
                "outgoing", "social", "energetic", "talkative", "leader", "party", "friend",
                "community", "public", "entertainer", "speaker", "active", "busy"
            ],
            "Agreeableness": [
                "kind", "compassionate", "cooperative", "volunteer", "caring", "nurse",
                "helper", "gentle", "peaceful", "loving", "generous", "friend"
            ],
            "Neuroticism": [
                "anxious", "emotional", "sensitive", "worried", "stressed", "fearful",
                "nervous", "moody", "temper", "sad", "grief", "loss"
            ]
        }

    def predict(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze family member data and return OCEAN scores with evidence.
        """
        scores = {trait: 0 for trait in self.lexicons}
        evidence = {trait: [] for trait in self.lexicons}
        total_hits = 0

        # Combine text sources
        text_sources = [
            ("Bio", member_data.get("bio", "")),
            ("Occupation", member_data.get("occupation", "")),
            ("Notes", member_data.get("notes", ""))
        ]

        # Analyze text
        for source_name, text in text_sources:
            if not text:
                continue
            
            text_lower = text.lower()
            words = re.findall(r'\b\w+\b', text_lower)

            for trait, keywords in self.lexicons.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        # Simple presence check (can be improved to frequency)
                        # We use word boundary check via regex for better accuracy? 
                        # For simplicity/speed in this prototype, string inclusion is okay 
                        # but "plan" is in "planet". Let's use word check.
                        if keyword in words:
                            scores[trait] += 10 # Base points per keyword
                            evidence[trait].append({
                                "source": source_name,
                                "snippet": f"...{keyword}..."
                            })
                            total_hits += 1

        # Normalize scores (0-100)
        # Base score is 50 (neutral)
        final_scores = {}
        for trait, score in scores.items():
            # Cap at 100, min 10
            # Add some variance based on hash of ID to make them not all 50 if empty?
            # No, empty should be neutral or "unknown".
            
            # Sigmoid-like scaling or simple clamping
            normalized = 50 + score
            final_scores[trait] = min(max(normalized, 10), 100)

        # Calculate confidence
        confidence = min(total_hits * 10, 90) # Cap at 90%
        if confidence == 0:
             confidence = 20 # Low confidence baseline

        return {
            "scores": final_scores,
            "confidence": confidence,
            "evidence": evidence
        }

predictor = PersonalityPredictor()
