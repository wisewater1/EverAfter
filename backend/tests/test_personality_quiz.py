from app.services.personality_quiz import PersonalityQuizEngine, QUESTIONS, _resolve_archetype


def test_uniform_strongly_disagree_is_not_forced_to_balanced():
    answers = {question["id"]: 1 for question in QUESTIONS}
    engine = PersonalityQuizEngine()

    profile = engine.submit_answers("session-1", answers, member_id="member-1", member_name="Casey")

    assert profile["archetype"]["name"] != "The Balanced One"


def test_centered_profile_with_nonuniform_answers_can_still_be_balanced():
    centered_scores = {
        "openness": 49.0,
        "conscientiousness": 52.0,
        "extraversion": 50.0,
        "agreeableness": 48.0,
        "neuroticism": 46.0,
    }
    mixed_answers = {"Q1": 2, "Q2": 4, "Q3": 3, "Q4": 2}

    archetype = _resolve_archetype(centered_scores, mixed_answers)

    assert archetype["name"] == "The Balanced One"
