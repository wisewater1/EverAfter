"""
PersonalityQuizEngine — 50-question personality assessment.

Scientifically grounded in the Big Five / OCEAN model with proper
sub-facet coverage per Costa & McCrae's NEO-PI-R framework:

  Openness:          Fantasy, Aesthetics, Feelings, Actions, Ideas, Values
  Conscientiousness: Competence, Order, Dutifulness, Achievement, Self-Discipline, Deliberation
  Extraversion:      Warmth, Gregariousness, Assertiveness, Activity, Excitement-Seeking, Positive Emotions
  Agreeableness:     Trust, Straightforwardness, Altruism, Compliance, Modesty, Tender-mindedness
  Neuroticism:       Anxiety, Hostility, Depression, Self-consciousness, Impulsiveness, Vulnerability

Each trait has 10 questions covering multiple facets.
Balanced keying: ~4-5 reverse-scored items per trait to reduce acquiescence bias.

Scoring produces a rich personality profile with:
  - OCEAN scores (0-100)
  - Sub-facet breakdowns
  - Personality archetype
  - Communication style
  - Family role prediction
  - Strengths & growth areas
"""

from __future__ import annotations

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime


# ═════════════════════════════════════════════════════════════════
#  50-Question Bank — Balanced & Facet-Comprehensive
# ═════════════════════════════════════════════════════════════════

QUESTIONS: List[Dict[str, Any]] = [
    # ── OPENNESS TO EXPERIENCE ─────────────────────────────────
    # Covers: Fantasy, Aesthetics, Feelings, Actions, Ideas, Values
    {"id": "O1",  "text": "I often get lost in my imagination, creating vivid scenarios in my mind.",
     "trait": "openness", "facet": "fantasy", "reverse": False, "category": "Creativity & Imagination"},
    {"id": "O2",  "text": "I am deeply moved by art, music, or poetry.",
     "trait": "openness", "facet": "aesthetics", "reverse": False, "category": "Creativity & Imagination"},
    {"id": "O3",  "text": "I experience my emotions deeply and believe feelings are important guides.",
     "trait": "openness", "facet": "feelings", "reverse": False, "category": "Creativity & Imagination"},
    {"id": "O4",  "text": "I prefer familiar routines and rarely try new ways of doing things.",
     "trait": "openness", "facet": "actions", "reverse": True, "category": "Creativity & Imagination"},
    {"id": "O5",  "text": "I enjoy tackling abstract or theoretical problems.",
     "trait": "openness", "facet": "ideas", "reverse": False, "category": "Creativity & Imagination"},
    {"id": "O6",  "text": "I believe that moral rules are fixed and should not be questioned.",
     "trait": "openness", "facet": "values", "reverse": True, "category": "Creativity & Imagination"},
    {"id": "O7",  "text": "I actively seek out experiences that challenge my worldview.",
     "trait": "openness", "facet": "actions", "reverse": False, "category": "Creativity & Imagination"},
    {"id": "O8",  "text": "I find it hard to understand why some people get emotional over a sunset or a song.",
     "trait": "openness", "facet": "aesthetics", "reverse": True, "category": "Creativity & Imagination"},
    {"id": "O9",  "text": "I enjoy exploring big philosophical questions about life and meaning.",
     "trait": "openness", "facet": "ideas", "reverse": False, "category": "Creativity & Imagination"},
    {"id": "O10", "text": "I am not very imaginative — I deal with the world as it is.",
     "trait": "openness", "facet": "fantasy", "reverse": True, "category": "Creativity & Imagination"},

    # ── CONSCIENTIOUSNESS ──────────────────────────────────────
    # Covers: Competence, Order, Dutifulness, Achievement-Striving,
    #         Self-Discipline, Deliberation
    {"id": "C1",  "text": "I feel capable and effective in most things I undertake.",
     "trait": "conscientiousness", "facet": "competence", "reverse": False, "category": "Discipline & Organization"},
    {"id": "C2",  "text": "I keep my belongings neat and my spaces organized.",
     "trait": "conscientiousness", "facet": "order", "reverse": False, "category": "Discipline & Organization"},
    {"id": "C3",  "text": "When I make a promise, I always follow through — no exceptions.",
     "trait": "conscientiousness", "facet": "dutifulness", "reverse": False, "category": "Discipline & Organization"},
    {"id": "C4",  "text": "I lack ambition and don't push myself to achieve more.",
     "trait": "conscientiousness", "facet": "achievement", "reverse": True, "category": "Discipline & Organization"},
    {"id": "C5",  "text": "Once I start a task, I persist until it's done, even if it becomes tedious.",
     "trait": "conscientiousness", "facet": "self_discipline", "reverse": False, "category": "Discipline & Organization"},
    {"id": "C6",  "text": "I often make decisions on the spur of the moment without thinking them through.",
     "trait": "conscientiousness", "facet": "deliberation", "reverse": True, "category": "Discipline & Organization"},
    {"id": "C7",  "text": "I strive to be the best at whatever I do.",
     "trait": "conscientiousness", "facet": "achievement", "reverse": False, "category": "Discipline & Organization"},
    {"id": "C8",  "text": "My workspace is usually messy — I know where things are though.",
     "trait": "conscientiousness", "facet": "order", "reverse": True, "category": "Discipline & Organization"},
    {"id": "C9",  "text": "I carefully weigh the pros and cons before making important decisions.",
     "trait": "conscientiousness", "facet": "deliberation", "reverse": False, "category": "Discipline & Organization"},
    {"id": "C10", "text": "I sometimes let responsibilities slide if something more fun comes up.",
     "trait": "conscientiousness", "facet": "dutifulness", "reverse": True, "category": "Discipline & Organization"},

    # ── EXTRAVERSION ───────────────────────────────────────────
    # Covers: Warmth, Gregariousness, Assertiveness, Activity,
    #         Excitement-Seeking, Positive Emotions
    {"id": "E1",  "text": "I genuinely enjoy making others feel welcome and at ease.",
     "trait": "extraversion", "facet": "warmth", "reverse": False, "category": "Social Energy"},
    {"id": "E2",  "text": "I prefer quiet evenings alone over large social gatherings.",
     "trait": "extraversion", "facet": "gregariousness", "reverse": True, "category": "Social Energy"},
    {"id": "E3",  "text": "I naturally take charge in group situations.",
     "trait": "extraversion", "facet": "assertiveness", "reverse": False, "category": "Social Energy"},
    {"id": "E4",  "text": "I always seem to be busy — I like keeping an active, fast-paced life.",
     "trait": "extraversion", "facet": "activity", "reverse": False, "category": "Social Energy"},
    {"id": "E5",  "text": "I crave excitement, thrills, and strong sensations.",
     "trait": "extraversion", "facet": "excitement_seeking", "reverse": False, "category": "Social Energy"},
    {"id": "E6",  "text": "I rarely feel strong bursts of joy or excitement.",
     "trait": "extraversion", "facet": "positive_emotions", "reverse": True, "category": "Social Energy"},
    {"id": "E7",  "text": "I find it draining to be around people for too long.",
     "trait": "extraversion", "facet": "gregariousness", "reverse": True, "category": "Social Energy"},
    {"id": "E8",  "text": "I laugh easily and often feel cheerful and optimistic.",
     "trait": "extraversion", "facet": "positive_emotions", "reverse": False, "category": "Social Energy"},
    {"id": "E9",  "text": "I usually let others take the lead rather than asserting myself.",
     "trait": "extraversion", "facet": "assertiveness", "reverse": True, "category": "Social Energy"},
    {"id": "E10", "text": "I form deep emotional bonds quickly with people I meet.",
     "trait": "extraversion", "facet": "warmth", "reverse": False, "category": "Social Energy"},

    # ── AGREEABLENESS ──────────────────────────────────────────
    # Covers: Trust, Straightforwardness, Altruism, Compliance,
    #         Modesty, Tender-mindedness
    {"id": "A1",  "text": "I believe most people are fundamentally honest and well-intentioned.",
     "trait": "agreeableness", "facet": "trust", "reverse": False, "category": "Empathy & Cooperation"},
    {"id": "A2",  "text": "I sometimes bend the truth to get what I want or avoid conflict.",
     "trait": "agreeableness", "facet": "straightforwardness", "reverse": True, "category": "Empathy & Cooperation"},
    {"id": "A3",  "text": "I go out of my way to help others, even if there's nothing in it for me.",
     "trait": "agreeableness", "facet": "altruism", "reverse": False, "category": "Empathy & Cooperation"},
    {"id": "A4",  "text": "I would rather fight back than give in when someone challenges me.",
     "trait": "agreeableness", "facet": "compliance", "reverse": True, "category": "Empathy & Cooperation"},
    {"id": "A5",  "text": "I don't think I'm better than other people, regardless of my achievements.",
     "trait": "agreeableness", "facet": "modesty", "reverse": False, "category": "Empathy & Cooperation"},
    {"id": "A6",  "text": "I am deeply moved by others' suffering and want to help them.",
     "trait": "agreeableness", "facet": "tender_mindedness", "reverse": False, "category": "Empathy & Cooperation"},
    {"id": "A7",  "text": "I tend to be suspicious of others' motives.",
     "trait": "agreeableness", "facet": "trust", "reverse": True, "category": "Empathy & Cooperation"},
    {"id": "A8",  "text": "I prefer to cooperate rather than compete, even in professional settings.",
     "trait": "agreeableness", "facet": "compliance", "reverse": False, "category": "Empathy & Cooperation"},
    {"id": "A9",  "text": "I enjoy receiving praise and recognition for my accomplishments.",
     "trait": "agreeableness", "facet": "modesty", "reverse": True, "category": "Empathy & Cooperation"},
    {"id": "A10", "text": "I always try to be sincere and genuine in my interactions.",
     "trait": "agreeableness", "facet": "straightforwardness", "reverse": False, "category": "Empathy & Cooperation"},

    # ── NEUROTICISM ────────────────────────────────────────────
    # Covers: Anxiety, Hostility, Depression, Self-consciousness,
    #         Impulsiveness, Vulnerability
    {"id": "N1",  "text": "I frequently worry about things that could go wrong in the future.",
     "trait": "neuroticism", "facet": "anxiety", "reverse": False, "category": "Emotional Patterns"},
    {"id": "N2",  "text": "I rarely feel angry or irritated, even when provoked.",
     "trait": "neuroticism", "facet": "hostility", "reverse": True, "category": "Emotional Patterns"},
    {"id": "N3",  "text": "I sometimes feel hopeless or like things will never get better.",
     "trait": "neuroticism", "facet": "depression", "reverse": False, "category": "Emotional Patterns"},
    {"id": "N4",  "text": "I feel embarrassed easily and care a lot about what others think of me.",
     "trait": "neuroticism", "facet": "self_consciousness", "reverse": False, "category": "Emotional Patterns"},
    {"id": "N5",  "text": "I have strong urges that I find hard to resist (snacking, shopping, etc.).",
     "trait": "neuroticism", "facet": "impulsiveness", "reverse": False, "category": "Emotional Patterns"},
    {"id": "N6",  "text": "I handle stressful situations calmly and feel in control.",
     "trait": "neuroticism", "facet": "vulnerability", "reverse": True, "category": "Emotional Patterns"},
    {"id": "N7",  "text": "I tend to dwell on mistakes and replay embarrassing moments in my head.",
     "trait": "neuroticism", "facet": "self_consciousness", "reverse": False, "category": "Emotional Patterns"},
    {"id": "N8",  "text": "I am an emotionally stable person — not much shakes me.",
     "trait": "neuroticism", "facet": "anxiety", "reverse": True, "category": "Emotional Patterns"},
    {"id": "N9",  "text": "I get frustrated quickly when things don't go as planned.",
     "trait": "neuroticism", "facet": "hostility", "reverse": False, "category": "Emotional Patterns"},
    {"id": "N10", "text": "I feel confident that I can cope with whatever life throws at me.",
     "trait": "neuroticism", "facet": "vulnerability", "reverse": True, "category": "Emotional Patterns"},
]


# ── Sub-facet labels ─────────────────────────────────────────────

FACET_LABELS: Dict[str, str] = {
    "fantasy": "Imagination", "aesthetics": "Aesthetic Appreciation",
    "feelings": "Emotional Depth", "actions": "Openness to Action",
    "ideas": "Intellectual Curiosity", "values": "Value Flexibility",
    "competence": "Self-Efficacy", "order": "Orderliness",
    "dutifulness": "Sense of Duty", "achievement": "Achievement Drive",
    "self_discipline": "Self-Discipline", "deliberation": "Deliberation",
    "warmth": "Warmth", "gregariousness": "Sociability",
    "assertiveness": "Assertiveness", "activity": "Activity Level",
    "excitement_seeking": "Excitement-Seeking", "positive_emotions": "Cheerfulness",
    "trust": "Trust", "straightforwardness": "Straightforwardness",
    "altruism": "Altruism", "compliance": "Cooperation",
    "modesty": "Modesty", "tender_mindedness": "Tender-mindedness",
    "anxiety": "Anxiety", "hostility": "Anger/Hostility",
    "depression": "Depression Proneness", "self_consciousness": "Self-Consciousness",
    "impulsiveness": "Impulsiveness", "vulnerability": "Stress Vulnerability",
}


# ── Trait descriptions ───────────────────────────────────────────

TRAIT_DESCRIPTORS: Dict[str, Dict[str, str]] = {
    "openness": {
        "high": "Imaginative, curious, and open to new experiences. You thrive on novelty, abstract thinking, and creative exploration.",
        "medium": "You balance curiosity with practicality — open to new ideas but grounded in what works.",
        "low": "Practical, conventional, and grounded. You value tradition, routine, and concrete reality over abstraction.",
    },
    "conscientiousness": {
        "high": "Highly organized, disciplined, and goal-oriented. You keep your promises, plan meticulously, and persist through challenges.",
        "medium": "You balance structure with flexibility — reliable when it counts but not rigid about it.",
        "low": "Spontaneous, flexible, and free-flowing. You respond to life as it comes rather than binding yourself to plans.",
    },
    "extraversion": {
        "high": "Outgoing, energetic, and assertive. You draw energy from people, take charge naturally, and experience strong positive emotions.",
        "medium": "Ambivert — you enjoy both social engagement and solitude, adapting fluidly to the context.",
        "low": "Introspective, reserved, and self-contained. You recharge through quiet reflection and prefer depth over breadth in relationships.",
    },
    "agreeableness": {
        "high": "Compassionate, trusting, and cooperative. You prioritize harmony, genuinely care for others, and extend the benefit of the doubt.",
        "medium": "You balance empathy with healthy skepticism — warm but with strong personal boundaries.",
        "low": "Independent, competitive, and strategically minded. You value efficiency and directness over social niceties.",
    },
    "neuroticism": {
        "high": "Emotionally sensitive and deeply feeling. You experience anxiety, mood shifts, and stress more intensely than most.",
        "medium": "You have typical emotional variability — sometimes stressed, sometimes calm, generally resilient.",
        "low": "Emotionally stable, calm, and composed. You handle stress with grace and rarely feel overwhelmed.",
    },
}


# ── Derive communication style from multi-trait interaction ──────

def _derive_communication_style(scores: Dict[str, float]) -> str:
    o = scores.get("openness", 50)
    c = scores.get("conscientiousness", 50)
    e = scores.get("extraversion", 50)
    a = scores.get("agreeableness", 50)
    n = scores.get("neuroticism", 50)

    tone = []
    if e > 65:
        tone.append("warm, expressive, and energetic")
    elif e < 35:
        tone.append("thoughtful, measured, and deliberate")
    else:
        tone.append("adaptively balanced between outgoing and reflective")

    if a > 65:
        tone.append("empathetic and supportive in conflicts")
    elif a < 35:
        tone.append("direct and unflinching — tells it like it is")
    else:
        tone.append("fair-minded and diplomatic")

    if o > 65:
        tone.append("Uses metaphor, storytelling, and creative language")
    elif o < 35:
        tone.append("Prefers clear, literal, and concrete language")

    if c > 65:
        tone.append("Communicates with precision and structures thoughts logically")
    elif c < 35:
        tone.append("Speaks freely and associatively, jumping between ideas")

    if n > 65:
        tone.append("May need reassurance and check-ins during stressful times")
    elif n < 35:
        tone.append("Maintains composure even when delivering difficult news")

    return " | ".join(tone) + "."


# ── Derive trait labels from scores ──────────────────────────────

def _derive_traits(scores: Dict[str, float]) -> List[str]:
    trait_words: List[str] = []

    o = scores.get("openness", 50)
    c = scores.get("conscientiousness", 50)
    e = scores.get("extraversion", 50)
    a = scores.get("agreeableness", 50)
    n = scores.get("neuroticism", 50)

    # Openness
    if o >= 70: trait_words.extend(["Visionary", "Creative"])
    elif o >= 55: trait_words.append("Curious")
    elif o < 35: trait_words.extend(["Practical", "Grounded"])

    # Conscientiousness
    if c >= 70: trait_words.extend(["Disciplined", "Meticulous"])
    elif c >= 55: trait_words.append("Reliable")
    elif c < 35: trait_words.extend(["Spontaneous", "Free-spirited"])

    # Extraversion
    if e >= 70: trait_words.extend(["Charismatic", "Energetic"])
    elif e >= 55: trait_words.append("Sociable")
    elif e < 35: trait_words.extend(["Introspective", "Quiet"])

    # Agreeableness
    if a >= 70: trait_words.extend(["Compassionate", "Selfless"])
    elif a >= 55: trait_words.append("Kind")
    elif a < 35: trait_words.extend(["Independent", "Competitive"])

    # Neuroticism → framed as emotional style
    if n >= 70: trait_words.extend(["Deeply Feeling", "Sensitive"])
    elif n < 35: trait_words.extend(["Resilient", "Unshakable"])

    if len(trait_words) == 0:
        trait_words = ["Balanced", "Adaptable", "Well-rounded"]

    return trait_words[:7]


# ── Derive family role prediction ────────────────────────────────

def _derive_family_role(scores: Dict[str, float]) -> Dict[str, str]:
    o = scores.get("openness", 50)
    c = scores.get("conscientiousness", 50)
    e = scores.get("extraversion", 50)
    a = scores.get("agreeableness", 50)
    n = scores.get("neuroticism", 50)

    if a > 65 and e > 55:
        return {"role": "The Nurturer", "description": "Keeps the family emotionally connected and supported."}
    if c > 65 and a > 50:
        return {"role": "The Organizer", "description": "Plans gatherings, manages logistics, keeps things running."}
    if e > 65 and o > 55:
        return {"role": "The Entertainer", "description": "Brings fun, energy, and laughter to family events."}
    if o > 65 and n < 45:
        return {"role": "The Innovator", "description": "Introduces new ideas and traditions to the family."}
    if a > 60 and n > 55:
        return {"role": "The Mediator", "description": "Senses tension and works to resolve family conflicts."}
    if c > 60 and e < 45:
        return {"role": "The Backbone", "description": "Quietly reliable — the one everyone depends on."}
    if o > 55 and e < 40:
        return {"role": "The Wisdom-Keeper", "description": "Remembers stories, preserves traditions, passes down lessons."}
    return {"role": "The Glue", "description": "Holds the family together through presence and consistency."}


# ── Derive strengths and growth areas ────────────────────────────

def _derive_strengths_and_growth(scores: Dict[str, float]) -> Dict[str, List[str]]:
    strengths: List[str] = []
    growth: List[str] = []

    if scores.get("openness", 50) > 60:
        strengths.append("Creative problem-solving and adaptability")
    else:
        growth.append("Exploring outside your comfort zone occasionally")

    if scores.get("conscientiousness", 50) > 60:
        strengths.append("Reliability, follow-through, and self-discipline")
    else:
        growth.append("Building consistency in important commitments")

    if scores.get("extraversion", 50) > 60:
        strengths.append("Social charisma and energizing presence")
    else:
        growth.append("Practicing assertiveness in group settings")

    if scores.get("agreeableness", 50) > 60:
        strengths.append("Deep empathy and ability to build trust")
    else:
        growth.append("Extending trust and showing vulnerability")

    if scores.get("neuroticism", 50) < 45:
        strengths.append("Emotional resilience and calm under pressure")
    else:
        growth.append("Developing stress management techniques")

    return {"strengths": strengths[:4], "growth_areas": growth[:3]}


# ═════════════════════════════════════════════════════════════════
#  PersonalityQuizEngine
# ═════════════════════════════════════════════════════════════════

class PersonalityQuizEngine:
    """
    Manages quiz sessions, scores answers, and produces
    rich personality profiles with sub-facet breakdowns.
    """

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._profiles: Dict[str, Dict[str, Any]] = {}

    def get_questions(self) -> List[Dict[str, Any]]:
        """Return all 50 questions."""
        return [
            {
                "id": q["id"],
                "text": q["text"],
                "category": q["category"],
                "number": i + 1,
            }
            for i, q in enumerate(QUESTIONS)
        ]

    def start_session(self, member_id: str, member_name: str = "") -> Dict[str, Any]:
        session_id = str(uuid.uuid4())[:12]
        self._sessions[session_id] = {
            "session_id": session_id,
            "member_id": member_id,
            "member_name": member_name,
            "answers": {},
            "started_at": datetime.utcnow().isoformat(),
            "completed": False,
        }
        return {
            "session_id": session_id,
            "member_id": member_id,
            "member_name": member_name,
            "total_questions": len(QUESTIONS),
            "questions": self.get_questions(),
        }

    def submit_answers(
        self,
        session_id: str,
        answers: Dict[str, int],
    ) -> Dict[str, Any]:
        session = self._sessions.get(session_id)
        if not session:
            return {"error": "Session not found"}

        session["answers"] = answers
        session["completed"] = True
        session["completed_at"] = datetime.utcnow().isoformat()

        scores = self._compute_scores(answers)
        facet_scores = self._compute_facet_scores(answers)
        profile = self._build_profile(
            session["member_id"], session["member_name"],
            scores, facet_scores, answers,
        )

        self._profiles[session["member_id"]] = profile
        return profile

    def get_profile(self, member_id: str) -> Optional[Dict[str, Any]]:
        return self._profiles.get(member_id)

    # ── Scoring ──────────────────────────────────────────────────

    def _compute_scores(self, answers: Dict[str, int]) -> Dict[str, float]:
        trait_scores: Dict[str, List[float]] = {
            "openness": [], "conscientiousness": [],
            "extraversion": [], "agreeableness": [], "neuroticism": [],
        }

        for q in QUESTIONS:
            raw = answers.get(q["id"])
            if raw is None:
                continue
            score = (6 - raw) if q["reverse"] else raw
            trait_scores[q["trait"]].append(score)

        result: Dict[str, float] = {}
        for trait, values in trait_scores.items():
            if values:
                avg = sum(values) / len(values)
                result[trait] = round((avg - 1) / 4 * 100, 1)
            else:
                result[trait] = 50.0
        return result

    def _compute_facet_scores(self, answers: Dict[str, int]) -> Dict[str, Dict[str, float]]:
        """Compute sub-facet scores grouped by trait."""
        facet_raw: Dict[str, Dict[str, List[float]]] = {}

        for q in QUESTIONS:
            raw = answers.get(q["id"])
            if raw is None:
                continue
            score = (6 - raw) if q["reverse"] else raw
            trait = q["trait"]
            facet = q.get("facet", "general")
            facet_raw.setdefault(trait, {}).setdefault(facet, []).append(score)

        result: Dict[str, Dict[str, float]] = {}
        for trait, facets in facet_raw.items():
            result[trait] = {}
            for facet, values in facets.items():
                avg = sum(values) / len(values)
                result[trait][facet] = round((avg - 1) / 4 * 100, 1)
        return result

    # ── Profile builder ──────────────────────────────────────────

    def _build_profile(
        self,
        member_id: str,
        member_name: str,
        scores: Dict[str, float],
        facet_scores: Dict[str, Dict[str, float]],
        answers: Dict[str, int],
    ) -> Dict[str, Any]:

        def level(score: float) -> str:
            if score >= 65: return "high"
            if score <= 35: return "low"
            return "medium"

        trait_details = {}
        for trait, score in scores.items():
            lvl = level(score)
            facets = {}
            for facet_key, facet_score in facet_scores.get(trait, {}).items():
                facets[facet_key] = {
                    "score": facet_score,
                    "label": FACET_LABELS.get(facet_key, facet_key),
                    "level": level(facet_score),
                }
            trait_details[trait] = {
                "score": score,
                "level": lvl,
                "description": TRAIT_DESCRIPTORS.get(trait, {}).get(lvl, ""),
                "facets": facets,
            }

        archetype = self._determine_archetype(scores)
        family_role = _derive_family_role(scores)
        strengths_growth = _derive_strengths_and_growth(scores)

        # Radar-chart compatible format for the TrainingCenter
        radar_data = [
            {"subject": "Openness",          "A": scores.get("openness", 50),          "fullMark": 100},
            {"subject": "Conscientiousness", "A": scores.get("conscientiousness", 50), "fullMark": 100},
            {"subject": "Extraversion",      "A": scores.get("extraversion", 50),      "fullMark": 100},
            {"subject": "Agreeableness",     "A": scores.get("agreeableness", 50),     "fullMark": 100},
            {"subject": "Emotional Stability","A": round(100 - scores.get("neuroticism", 50), 1), "fullMark": 100},
        ]

        return {
            "member_id": member_id,
            "member_name": member_name,
            "scores": scores,
            "trait_details": trait_details,
            "traits": _derive_traits(scores),
            "communication_style": _derive_communication_style(scores),
            "archetype": archetype,
            "family_role": family_role,
            "strengths": strengths_growth["strengths"],
            "growth_areas": strengths_growth["growth_areas"],
            "emotional_stability": round(100 - scores.get("neuroticism", 50), 1),
            "radar_data": radar_data,
            "total_questions": len(QUESTIONS),
            "answered": len(answers),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def _determine_archetype(self, scores: Dict[str, float]) -> Dict[str, str]:
        o = scores.get("openness", 50)
        c = scores.get("conscientiousness", 50)
        e = scores.get("extraversion", 50)
        a = scores.get("agreeableness", 50)
        n = scores.get("neuroticism", 50)

        # 16 distinct archetypes covering the full OCEAN space
        if o > 70 and e > 65:
            return {"name": "The Explorer", "emoji": "🧭", "description": "Adventurous and magnetic — you seek the unknown and take everyone along for the ride."}
        if c > 70 and a > 65:
            return {"name": "The Guardian", "emoji": "🛡️", "description": "Dependable and caring — you protect others while keeping everything in order."}
        if o > 65 and n < 35:
            return {"name": "The Visionary", "emoji": "🔮", "description": "Creative and emotionally steady — you envision bold futures with unshakable confidence."}
        if a > 70 and n > 60:
            return {"name": "The Healer", "emoji": "💚", "description": "Deeply empathetic and emotionally attuned — you sense and soothe pain others can't see."}
        if e > 70 and c > 60:
            return {"name": "The Commander", "emoji": "👑", "description": "Assertive and organized — you inspire action and lead with both charisma and competence."}
        if o > 60 and e < 35:
            return {"name": "The Sage", "emoji": "📚", "description": "Introspective and intellectually rich — you seek deep truth in solitude."}
        if c > 70 and e < 40:
            return {"name": "The Scholar", "emoji": "🎓", "description": "Methodical and reserved — you master your craft through persistent, quiet dedication."}
        if e > 65 and a > 60:
            return {"name": "The Connector", "emoji": "🤝", "description": "Warm and outgoing — you build bridges between people and create community."}
        if o > 60 and c < 35:
            return {"name": "The Artist", "emoji": "🎨", "description": "Free-spirited and imaginative — you follow inspiration wherever it leads."}
        if c > 65 and n < 35:
            return {"name": "The Architect", "emoji": "📐", "description": "Precise and imperturbable — you build reliable systems with calm mastery."}
        if a < 35 and e > 60:
            return {"name": "The Maverick", "emoji": "🚀", "description": "Bold and independent — you challenge conventions and forge your own path."}
        if n > 65 and o > 55:
            return {"name": "The Poet", "emoji": "🌙", "description": "Emotionally deep and creatively expressive — you transform pain into beauty."}
        if a > 60 and c > 55 and e < 45:
            return {"name": "The Steward", "emoji": "🏡", "description": "Quietly devoted and dependable — you serve others through steady, humble action."}
        if e > 60 and n < 40:
            return {"name": "The Catalyst", "emoji": "⚡", "description": "Socially confident and emotionally stable — you energize and uplift everyone around you."}
        if o < 40 and c > 60:
            return {"name": "The Sentinel", "emoji": "⚓", "description": "Traditional and disciplined — you anchor the family with stability and proven values."}
        if a > 55 and n < 40 and e > 50:
            return {"name": "The Diplomat", "emoji": "🕊️", "description": "Composed, agreeable, and socially adept — you navigate tension with grace."}

        return {"name": "The Balanced One", "emoji": "⚖️", "description": "Well-rounded and adaptable — you navigate life with versatility and inner harmony."}


# ── Singleton ────────────────────────────────────────────────────

quiz_engine = PersonalityQuizEngine()
