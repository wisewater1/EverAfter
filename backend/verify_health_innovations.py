"""
Verification script for the 5 Health Innovation engines.

Run from the backend directory:
    python verify_health_innovations.py
"""
import asyncio
import json
import sys
import traceback


# ── Synthetic test data ──────────────────────────────────────────

SAMPLE_METRICS = [
    {"metric_type": "resting_heart_rate", "value": 72, "date": "2026-02-25"},
    {"metric_type": "resting_heart_rate", "value": 74, "date": "2026-02-26"},
    {"metric_type": "resting_heart_rate", "value": 76, "date": "2026-02-27"},
    {"metric_type": "resting_heart_rate", "value": 78, "date": "2026-02-28"},
    {"metric_type": "resting_heart_rate", "value": 80, "date": "2026-03-01"},
    {"metric_type": "heart_rate_variability", "value": 48, "date": "2026-02-25"},
    {"metric_type": "heart_rate_variability", "value": 45, "date": "2026-02-26"},
    {"metric_type": "heart_rate_variability", "value": 42, "date": "2026-02-27"},
    {"metric_type": "heart_rate_variability", "value": 39, "date": "2026-02-28"},
    {"metric_type": "heart_rate_variability", "value": 36, "date": "2026-03-01"},
    {"metric_type": "sleep_duration", "value": 7.2, "date": "2026-02-25"},
    {"metric_type": "sleep_duration", "value": 6.8, "date": "2026-02-26"},
    {"metric_type": "sleep_duration", "value": 6.5, "date": "2026-02-27"},
    {"metric_type": "sleep_duration", "value": 6.0, "date": "2026-02-28"},
    {"metric_type": "sleep_duration", "value": 5.5, "date": "2026-03-01"},
    {"metric_type": "glucose", "value": 98, "date": "2026-02-25"},
    {"metric_type": "glucose", "value": 102, "date": "2026-02-26"},
    {"metric_type": "glucose", "value": 105, "date": "2026-02-27"},
    {"metric_type": "glucose", "value": 108, "date": "2026-02-28"},
    {"metric_type": "glucose", "value": 112, "date": "2026-03-01"},
    {"metric_type": "stress_level", "value": 5, "date": "2026-02-25"},
    {"metric_type": "stress_level", "value": 6, "date": "2026-02-26"},
    {"metric_type": "stress_level", "value": 7, "date": "2026-02-27"},
    {"metric_type": "stress_level", "value": 7, "date": "2026-02-28"},
    {"metric_type": "stress_level", "value": 8, "date": "2026-03-01"},
    {"metric_type": "steps", "value": 8000, "date": "2026-02-25"},
    {"metric_type": "steps", "value": 7500, "date": "2026-02-26"},
    {"metric_type": "steps", "value": 6800, "date": "2026-02-27"},
    {"metric_type": "steps", "value": 6000, "date": "2026-02-28"},
    {"metric_type": "steps", "value": 5500, "date": "2026-03-01"},
]

PERSONALITY_PROFILE = {
    "scores": {
        "openness": 65,
        "conscientiousness": 35,
        "extraversion": 40,
        "agreeableness": 55,
        "neuroticism": 72,
    }
}

FAMILY_MEMBERS = [
    {
        "id": "father-001",
        "firstName": "Marcus",
        "lastName": "St. Joseph",
        "relationship": "parent",
        "birthYear": 1975,
        "traits": ["hardworking", "stressed", "leader"],
        "metrics": [
            {"metric_type": "resting_heart_rate", "value": 82, "date": "2026-03-01"},
            {"metric_type": "stress_level", "value": 8, "date": "2026-03-01"},
            {"metric_type": "sleep_duration", "value": 5.5, "date": "2026-03-01"},
            {"metric_type": "heart_rate_variability", "value": 32, "date": "2026-03-01"},
            {"metric_type": "steps", "value": 4000, "date": "2026-03-01"},
        ],
    },
    {
        "id": "mother-001",
        "firstName": "Elena",
        "lastName": "St. Joseph",
        "relationship": "spouse",
        "birthYear": 1978,
        "traits": ["caring", "active", "anxious"],
        "metrics": [
            {"metric_type": "resting_heart_rate", "value": 70, "date": "2026-03-01"},
            {"metric_type": "stress_level", "value": 5, "date": "2026-03-01"},
            {"metric_type": "sleep_duration", "value": 7.0, "date": "2026-03-01"},
            {"metric_type": "heart_rate_variability", "value": 50, "date": "2026-03-01"},
            {"metric_type": "steps", "value": 8000, "date": "2026-03-01"},
        ],
    },
    {
        "id": "child-001",
        "firstName": "Sofia",
        "lastName": "St. Joseph",
        "relationship": "child",
        "birthYear": 2005,
        "traits": ["energetic", "social", "creative"],
        "metrics": [
            {"metric_type": "resting_heart_rate", "value": 68, "date": "2026-03-01"},
            {"metric_type": "stress_level", "value": 4, "date": "2026-03-01"},
            {"metric_type": "sleep_duration", "value": 7.5, "date": "2026-03-01"},
            {"metric_type": "heart_rate_variability", "value": 58, "date": "2026-03-01"},
            {"metric_type": "steps", "value": 9500, "date": "2026-03-01"},
        ],
    },
]

ANCESTORS = [
    {
        "firstName": "Giuseppe",
        "lastName": "St. Joseph",
        "relationship": "grandfather",
        "birthYear": 1945,
        "traits": ["hardworking", "sedentary", "stressed"],
        "health_events": [
            {"condition": "type_2_diabetes", "onset_age": 55},
            {"condition": "hypertension", "onset_age": 50},
        ],
        "metrics_at_age": {},
    },
    {
        "firstName": "Rosa",
        "lastName": "St. Joseph",
        "relationship": "grandmother",
        "birthYear": 1948,
        "traits": ["active", "caring", "anxious"],
        "health_events": [
            {"condition": "anxiety_depression", "onset_age": 42},
        ],
        "metrics_at_age": {},
    },
]


# ── Test runner ──────────────────────────────────────────────────

results = []


def record(name, passed, detail=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results.append((name, passed))
    print(f"  {status}  {name}")
    if detail:
        print(f"         {detail}")


async def test_background_simulator():
    print("\n═══ Feature 1: Background Simulator ═══")
    try:
        from app.services.causal_twin.background_simulator import background_simulator
        record("Import", True)
    except Exception as e:
        record("Import", False, str(e))
        return

    try:
        result = await background_simulator.get_background_insights("test-user", SAMPLE_METRICS)
        record("Runs simulation", True)
        record("Has simulation_id", "simulation_id" in result)
        record("Has overall_risk_score", "overall_risk_score" in result)
        record("Has insights", "insights" in result and isinstance(result["insights"], list))
        record("Has recommendations", "recommendations" in result)
        print(f"         Risk: {result['overall_risk_level']} ({result['overall_risk_score']})")
        print(f"         Insights: {len(result['insights'])}")
    except Exception as e:
        record("Execution", False, traceback.format_exc())


async def test_behavioral_forecaster():
    print("\n═══ Feature 2: Behavioral Forecaster ═══")
    try:
        from app.services.causal_twin.behavioral_forecaster import behavioral_forecaster
        record("Import", True)
    except Exception as e:
        record("Import", False, str(e))
        return

    try:
        result = await behavioral_forecaster.forecast_behavior(
            "test-user", SAMPLE_METRICS, PERSONALITY_PROFILE
        )
        record("Runs forecast", True)
        record("Has stress_state", "stress_state" in result)
        record("Has failure_modes", "predicted_failure_modes" in result)
        record("Has interventions", "interventions" in result)
        record("Has narrative", "narrative" in result)
        record("Stress detected", result["stress_state"]["is_stressed"])
        modes = result["predicted_failure_modes"]
        if modes:
            print(f"         Top failure mode: {modes[0]['label']} ({modes[0].get('probability', '?')})")
        print(f"         Interventions: {len(result['interventions'])}")
    except Exception as e:
        record("Execution", False, traceback.format_exc())


async def test_contagion_engine():
    print("\n═══ Feature 3: Contagion Engine ═══")
    try:
        from app.services.causal_twin.contagion_engine import contagion_engine
        record("Import", True)
    except Exception as e:
        record("Import", False, str(e))
        return

    try:
        result = await contagion_engine.get_contagion_report(
            "family-001", FAMILY_MEMBERS
        )
        record("Runs analysis", True)
        record("Has contagion_chains", "contagion_chains" in result)
        record("Has household_risk_score", "household_risk_score" in result)
        record("Has prescriptions", "household_prescriptions" in result)
        record("Has member_vulnerability", "member_vulnerability" in result)
        record("Has narrative", "narrative" in result)
        print(f"         Household risk: {result['household_risk_level']} ({result['household_risk_score']})")
        print(f"         Chains: {len(result['contagion_chains'])}")
        print(f"         Prescriptions: {len(result['household_prescriptions'])}")
    except Exception as e:
        record("Execution", False, traceback.format_exc())


async def test_epigenetic_ledger():
    print("\n═══ Feature 4: Epigenetic Ledger ═══")
    try:
        from app.services.causal_twin.epigenetic_ledger import epigenetic_ledger
        record("Import", True)
    except Exception as e:
        record("Import", False, str(e))
        return

    try:
        member = {
            "id": "user-001",
            "firstName": "Antonio",
            "lastName": "St. Joseph",
            "birthYear": 1990,
            "traits": ["active", "stressed"],
            "metrics": SAMPLE_METRICS,
        }
        result = await epigenetic_ledger.get_epigenetic_risk(
            "user-001", member, ANCESTORS
        )
        record("Runs analysis", True)
        record("Has aggregate_risk_score", "aggregate_risk_score" in result)
        record("Has age_comparisons", "age_comparisons" in result)
        record("Has leading_indicators", "leading_indicators" in result)
        record("Has hereditary_risks", "hereditary_risks" in result)
        record("Has recommendations", "recommendations" in result)
        record("Has narrative", "narrative" in result)
        print(f"         Risk: {result['aggregate_risk_level']} ({result['aggregate_risk_score']})")
        print(f"         Leading indicators: {len(result['leading_indicators'])}")
        print(f"         Hereditary risks: {len(result['hereditary_risks'])}")
    except Exception as e:
        record("Execution", False, traceback.format_exc())


async def test_environmental_matrix():
    print("\n═══ Feature 6: Environmental Matrix ═══")
    try:
        from app.services.causal_twin.environmental_matrix import environmental_matrix
        record("Import", True)
    except Exception as e:
        record("Import", False, str(e))
        return

    try:
        result = await environmental_matrix.get_susceptibility_report(
            "user-001", FAMILY_MEMBERS, location="Houston, TX"
        )
        record("Runs analysis", True)
        record("Has environmental_threats", "environmental_threats" in result)
        record("Has household_resilience", "household_resilience" in result)
        record("Has member_reports", "member_reports" in result)
        record("Has household_shields", "household_shields" in result)
        record("Has narrative", "narrative" in result)
        print(f"         Location: {result['location']}")
        print(f"         Household resilience: {result['household_resilience']}")
        print(f"         Household vulnerability: {result['household_vulnerability']}")
        dominant = result["environmental_threats"].get("dominant_threat", "?")
        print(f"         Dominant threat: {dominant}")
    except Exception as e:
        record("Execution", False, traceback.format_exc())


async def main():
    print("╔═══════════════════════════════════════════════════╗")
    print("║  Health Innovation Suite — Verification Script    ║")
    print("╚═══════════════════════════════════════════════════╝")

    await test_background_simulator()
    await test_behavioral_forecaster()
    await test_contagion_engine()
    await test_epigenetic_ledger()
    await test_environmental_matrix()

    # Summary
    total = len(results)
    passed = sum(1 for _, p in results if p)
    failed = total - passed
    print(f"\n{'═' * 52}")
    print(f"  TOTAL: {total}  |  PASSED: {passed}  |  FAILED: {failed}")
    print(f"{'═' * 52}")

    if failed > 0:
        print("\n  ❌ Some tests failed. Review output above.")
        sys.exit(1)
    else:
        print("\n  ✅ All tests passed! Health Innovation Suite is operational.")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
