import pytest
from datetime import datetime, timedelta
from app.models.dht import Observation, OceanProfile, OceanScores
from app.services.dht_engine import compute_dht, compute_behavioral_modifiers

def test_compute_behavioral_modifiers():
    # Test high neuroticism (anxiety)
    scores = OceanScores(O=50, C=50, E=50, A=50, N=80)
    mods = compute_behavioral_modifiers(scores)
    assert mods.alert_sensitivity == "calm"
    assert mods.intervention_style == "supportive"
    
    # Test high conscientiousness
    scores_c = OceanScores(O=50, C=80, E=50, A=50, N=50)
    mods_c = compute_behavioral_modifiers(scores_c)
    assert mods_c.intervention_style == "structured"
    assert mods_c.checklist_preference is True

def test_compute_dht_empty_observations():
    person_id = "test-123"
    dht = compute_dht(person_id=person_id, observations=[])
    
    assert dht.person_id == person_id
    assert dht.data_quality == "empty"
    assert dht.confidence == 0.0
    assert len(dht.risk_cards) == 0

def test_compute_dht_with_data():
    person_id = "test-123"
    now = datetime.utcnow()
    
    # Create some observations
    obs = [
        Observation(person_id=person_id, metric="resting_hr", value=60, unit="bpm", source="wearable", category="vital", recorded_at=now - timedelta(days=2)),
        Observation(person_id=person_id, metric="resting_hr", value=62, unit="bpm", source="wearable", category="vital", recorded_at=now - timedelta(days=1)),
        Observation(person_id=person_id, metric="steps", value=10000, unit="count", source="wearable", category="activity", recorded_at=now - timedelta(days=1)),
        Observation(person_id=person_id, metric="sleep_hours", value=8.0, unit="hours", source="wearable", category="sleep", recorded_at=now - timedelta(days=1)),
    ]
    
    ocean = OceanProfile(
        person_id=person_id,
        version=1,
        scores=OceanScores(O=50, C=50, E=50, A=50, N=50),
        computed_at=now
    )
    
    dht = compute_dht(person_id=person_id, observations=obs, ocean_profile=ocean)
    
    assert dht.data_quality in ["moderate", "rich"]
    assert "resting_hr" in dht.baselines
    assert dht.baselines["resting_hr"] > 0
    assert len(dht.risk_cards) > 0
    
    # Resting HR 62 is "optimal" (low risk)
    rhr_card = next((c for c in dht.risk_cards if c.domain == "cardiovascular"), None)
    assert rhr_card is not None
    assert rhr_card.current_level == "low"
