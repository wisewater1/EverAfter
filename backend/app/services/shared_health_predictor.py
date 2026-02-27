"""
SharedHealthPredictor — Unified health prediction engine for all Saints.

Wraps
  • Delphi model  (trajectory generation)
  • UncertaintyEngine  (confidence / evidence labelling)
  • EvidenceLedger (provenance)
  • DriftMonitor   (model freshness)
  • AncestryEngine (family-lineage risk)

Both St. Raphael and St. Joseph call this layer so predictions,
confidence scores, and evidence labels stay consistent system-wide.
"""

from __future__ import annotations

import uuid
import random
import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

# ── Lazy imports for optional heavy deps ─────────────────────────

def _uncertainty():
    from app.services.causal_twin.uncertainty_engine import uncertainty_engine
    return uncertainty_engine

def _evidence():
    from app.services.causal_twin.evidence_ledger import evidence_ledger
    return evidence_ledger

def _drift():
    from app.services.causal_twin.drift_monitor import drift_monitor
    return drift_monitor

def _ancestry():
    try:
        from app.services.causal_twin.ancestry_engine import ancestry_engine
        return ancestry_engine
    except Exception:
        return None

def _personality():
    """Lazy import of personality quiz engine."""
    try:
        from app.services.personality_quiz import quiz_engine
        return quiz_engine
    except Exception:
        return None


# ── Helper: build uncertainty metadata dict ──────────────────────

def _build_uncertainty(
    data_days: int = 0,
    data_completeness: float = 0.0,
    has_experiment: bool = False,
    contradictions: int = 0,
    evidence_type: str = "population_prior",
) -> Dict[str, Any]:
    ue = _uncertainty()
    conf = ue.assess_confidence(data_days, data_completeness, has_experiment, contradictions)
    return {
        "confidence_score": conf["score"],
        "confidence_level": conf["level"],
        "evidence_type": evidence_type,
        "data_days": data_days,
        "data_completeness": data_completeness,
        "explanation": conf["explanation"],
    }


# ── Trend helpers ────────────────────────────────────────────────

def _detect_trend(values: List[float]) -> str:
    """Very simple linear-regression direction from a list of recent values."""
    if len(values) < 3:
        return "unknown"
    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den else 0
    if slope > 0.05:
        return "declining"  # higher value = worse for most health metrics
    elif slope < -0.05:
        return "improving"
    return "stable"


def _risk_level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 30:
        return "moderate"
    return "low"


# ═════════════════════════════════════════════════════════════════
#  SharedHealthPredictor
# ═════════════════════════════════════════════════════════════════

class SharedHealthPredictor:
    """
    Single prediction facade used by **all** Saints.

    Usage:
        from app.services.shared_health_predictor import shared_predictor
        bundle = await shared_predictor.predict_user(user_id, history)
    """

    MODEL_VERSION = "shared-v1.0.0"

    # ── Individual prediction (St. Raphael primary) ──────────────

    async def predict_user(
        self,
        user_id: str,
        metrics_history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Produce a health-trend prediction for a single user.

        Returns a PredictionBundle-shaped dict.
        """
        # Determine data quality
        data_days = len(set(
            m.get("date", m.get("timestamp", ""))[:10]
            for m in metrics_history if m.get("date") or m.get("timestamp")
        ))
        completeness = min(data_days / 30.0, 1.0)

        # Extract primary metric values
        values = [m.get("value", 0) for m in metrics_history if m.get("value") is not None]
        trend = _detect_trend(values)

        # Phase 1: MVP - Classical Risk Baselines (T2D & Hypertension)
        t2d_risk = self._calculate_ada_t2d_risk(metrics_history, profile)
        htn_risk = self._calculate_aha_hypertension_risk(metrics_history, profile)
        
        # Select the dominant risk for the primary returned risk score (or blend)
        base_risk = max(t2d_risk, htn_risk)
        
        if values:
            mean_val = sum(values) / len(values)
            std_val = math.sqrt(sum((v - mean_val) ** 2 for v in values) / max(len(values), 1))
            volatility_penalty = min(std_val / max(mean_val, 1) * 20, 15)  # reduced penalty for classical models
            trend_penalty = {"declining": 10, "stable": 0, "improving": -5, "unknown": 0}
            base_risk += volatility_penalty + trend_penalty.get(trend, 0)
            
        risk_score = max(0, min(100, base_risk))

        # Medical Twin: attempt Delphi trajectory
        trajectory = await self._delphi_trajectory(user_id, metrics_history)

        # Detect drift
        drift = _drift()
        drift_info = drift.check_drift(user_id)
        contradictions = 1 if drift_info.get("drift_detected") else 0

        # Determine evidence type
        evidence_type = "strong_correlation" if data_days >= 14 else "population_prior"

        # Build risk factors
        risk_factors = self._extract_risk_factors(metrics_history, profile)

        # Recommendations via health heuristics
        recommendations = self._generate_recommendations(risk_score, trend, risk_factors)

        # Record in evidence ledger
        _evidence().record_recommendation(
            user_id=user_id,
            recommendation_text="; ".join(recommendations[:2]) if recommendations else "Continue monitoring",
            data_sources=["metrics_history", "delphi_trajectory"],
            confidence=100 - risk_score,
            evidence_type=evidence_type,
            model_version=self.MODEL_VERSION,
        )

        return {
            "user_id": user_id,
            "metric": metrics_history[0].get("metric_type", "composite") if metrics_history else "composite",
            "predicted_value": risk_score,
            "risk_level": _risk_level(risk_score),
            "trend": trend,
            "risk_factors": risk_factors,
            "trajectory": trajectory,
            "uncertainty": _build_uncertainty(
                data_days=data_days,
                data_completeness=completeness,
                contradictions=contradictions,
                evidence_type=evidence_type,
            ),
            "recommendations": recommendations,
            "generated_at": datetime.utcnow().isoformat(),
        }

    # ── Family-wide prediction (St. Joseph primary) ──────────────

    async def predict_family(
        self,
        user_id: str,
        family_members: List[Dict[str, Any]],
        consent_map: Optional[Dict[str, bool]] = None,
    ) -> Dict[str, Any]:
        """
        Predict health risks for every consented family member and
        aggregate into a family-level risk bundle.
        """
        consent_map = consent_map or {}
        member_predictions: List[Dict[str, Any]] = []
        scores: List[float] = []
        all_factors: List[Dict[str, Any]] = []

        for member in family_members:
            mid = member.get("id", str(uuid.uuid4()))
            name = f"{member.get('firstName', '')} {member.get('lastName', '')}".strip() or mid
            consented = consent_map.get(mid, True)  # default consent = True

            if not consented:
                member_predictions.append({
                    "member_id": mid,
                    "member_name": name,
                    "consent_granted": False,
                    "prediction": None,
                    "early_warnings": [],
                })
                continue

            # Build synthetic metrics from member data
            metrics = self._member_to_metrics(member)
            pred = await self.predict_user(mid, metrics, member)
            warnings = await self.detect_early_warnings(mid, metrics)

            member_predictions.append({
                "member_id": mid,
                "member_name": name,
                "consent_granted": True,
                "prediction": pred,
                "early_warnings": warnings,
            })
            scores.append(pred["predicted_value"])
            all_factors.extend(pred.get("risk_factors", []))

        # Aggregate
        avg_score = sum(scores) / max(len(scores), 1)
        shared_factors = self._deduplicate_factors(all_factors)

        return {
            "family_id": user_id,
            "aggregate_risk": _risk_level(avg_score),
            "aggregate_score": round(avg_score, 1),
            "member_predictions": member_predictions,
            "shared_risk_factors": shared_factors[:5],
            "uncertainty": _build_uncertainty(
                data_days=len(family_members) * 7,  # rough proxy
                data_completeness=len(scores) / max(len(family_members), 1),
                evidence_type="weak_correlation",
            ),
            "generated_at": datetime.utcnow().isoformat(),
        }

    # ── Scenario simulation (Medical Twin what-if) ───────────────

    async def simulate_scenario(
        self,
        user_id: str,
        scenarios: List[Dict[str, Any]],
        baseline_metrics: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        'What-if' simulation: predict outcome if user changes a behaviour.
        """
        baseline = baseline_metrics or []
        outcome: Dict[str, float] = {}
        risk_change: Dict[str, str] = {}
        intervals: Dict[str, List[float]] = {}

        for sc in scenarios:
            metric = sc.get("metric", "composite")
            change = sc.get("change_value", 0)
            direction = sc.get("change_type", "increase")
            duration = sc.get("duration_days", 30)

            # Current baseline for this metric
            relevant = [m.get("value", 50) for m in baseline if m.get("metric_type") == metric]
            current = sum(relevant) / max(len(relevant), 1) if relevant else 50.0

            # Apply scenario delta
            delta = change if direction == "increase" else -change
            projected = current + delta * (duration / 30.0)

            # Confine to sane range
            projected = max(0, min(200, projected))

            # Determine risk trajectory
            if delta < 0:
                risk_change[metric] = "improved"
            elif delta > 0:
                risk_change[metric] = "worsened"
            else:
                risk_change[metric] = "unchanged"

            outcome[metric] = round(projected, 1)
            spread = abs(delta) * 0.3 + 5  # uncertainty band
            intervals[metric] = [round(projected - spread, 1), round(projected, 1), round(projected + spread, 1)]

        narrative = self._scenario_narrative(scenarios, outcome, risk_change)

        return {
            "scenario_id": str(uuid.uuid4()),
            "user_id": user_id,
            "params": scenarios,
            "predicted_outcome": outcome,
            "risk_change": risk_change,
            "confidence_interval": intervals,
            "uncertainty": _build_uncertainty(
                data_days=len(baseline),
                data_completeness=0.5,
                evidence_type="medical_twin",
            ),
            "narrative": narrative,
            "generated_at": datetime.utcnow().isoformat(),
        }

    # ── Early-warning detection ──────────────────────────────────

    async def detect_early_warnings(
        self,
        user_id: str,
        recent_data: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Scan recent data for metrics with a concerning trend.
        Returns list of EarlyWarning-shaped dicts.
        """
        warnings: List[Dict[str, Any]] = []

        # Group data by metric_type
        by_metric: Dict[str, List[float]] = {}
        for d in recent_data:
            mt = d.get("metric_type", "unknown")
            v = d.get("value")
            if v is not None:
                by_metric.setdefault(mt, []).append(v)

        for metric, values in by_metric.items():
            if len(values) < 3:
                continue
            trend = _detect_trend(values)
            if trend == "declining":
                severity = "high" if values[-1] > values[0] * 1.3 else "moderate"
                warnings.append({
                    "warning_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "metric": metric,
                    "severity": severity,
                    "trend": trend,
                    "message": f"{metric.replace('_', ' ').title()} has been trending upward over the last {len(values)} readings.",
                    "recommended_action": f"Consider monitoring {metric.replace('_', ' ')} more closely and consult your healthcare provider if the trend continues.",
                    "confidence": min(len(values) * 10, 80),
                    "detected_at": datetime.utcnow().isoformat(),
                })

        return warnings

    # ── Private helpers ───────────────────────────────────────────

    async def _delphi_trajectory(
        self,
        user_id: str,
        history: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Try Delphi model for trajectory; fall back to linear extrapolation."""
        try:
            from app.services.health.service import health_service
            predictions = await health_service.get_predictions(user_id, history)
            if predictions and predictions[0].trajectory:
                return [
                    {"timestamp": p.timestamp.isoformat(), "value": p.value, "confidence": p.confidence}
                    for p in predictions[0].trajectory
                ]
        except Exception:
            pass

        # Fallback: simple linear projection
        values = [m.get("value", 50) for m in history[-7:]]
        if len(values) < 2:
            return []
        step = (values[-1] - values[0]) / max(len(values) - 1, 1)
        now = datetime.utcnow()
        return [
            {
                "timestamp": (now + timedelta(days=i)).isoformat(),
                "value": round(values[-1] + step * i, 1),
                "confidence": round(max(0.3, 0.9 - i * 0.1), 2),
            }
            for i in range(1, 8)
        ]

    def _extract_risk_factors(
        self,
        history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        factors: List[Dict[str, Any]] = []

        # Age-based
        birth_year = None
        if profile:
            birth_year = profile.get("birthYear") or profile.get("birth_year")
        if birth_year:
            age = datetime.utcnow().year - int(birth_year)
            if age > 60:
                factors.append({"factor": "Age > 60", "weight": 0.6, "source": "population_prior"})
            elif age > 40:
                factors.append({"factor": "Age > 40", "weight": 0.3, "source": "population_prior"})

        # Occupation stress
        occ = (profile or {}).get("occupation", "")
        if occ and any(kw in occ.lower() for kw in ["doctor", "nurse", "military", "police", "firefight"]):
            factors.append({"factor": "High-stress occupation", "weight": 0.4, "source": "population_prior"})

        # Volatility from data
        values = [m.get("value", 0) for m in history if m.get("value") is not None]
        if len(values) >= 5:
            mean_v = sum(values) / len(values)
            std_v = math.sqrt(sum((v - mean_v) ** 2 for v in values) / len(values))
            cv = std_v / max(mean_v, 1)
            if cv > 0.3:
                factors.append({"factor": "High metric volatility", "weight": round(min(cv, 0.8), 2), "source": "strong_correlation"})

        # Traits from profile
        traits = (profile or {}).get("traits", [])
        if isinstance(traits, list):
            stress_traits = [t for t in traits if any(kw in str(t).lower() for kw in ["anxious", "stress", "neuro"])]
            if stress_traits:
                factors.append({"factor": "Elevated stress traits", "weight": 0.35, "source": "weak_correlation"})

        # ── Personality Quiz OCEAN scores as psychological priors ────
        member_id = (profile or {}).get("id", "")
        pq = _personality()
        if pq and member_id:
            quiz_profile = pq.get_profile(member_id)
            if quiz_profile:
                scores = quiz_profile.get("scores", {})
                archetype = quiz_profile.get("archetype", {}).get("name", "")

                # High Neuroticism → stress vulnerability
                neuro = scores.get("neuroticism", 50)
                if neuro >= 65:
                    factors.append({
                        "factor": f"High emotional sensitivity (Neuroticism {neuro:.0f}%)",
                        "weight": round(0.2 + (neuro - 65) / 100, 2),
                        "source": "personality_quiz",
                    })

                # Low Conscientiousness → health risk factor
                consc = scores.get("conscientiousness", 50)
                if consc < 35:
                    factors.append({
                        "factor": f"Low self-discipline (Conscientiousness {consc:.0f}%)",
                        "weight": round(0.15 + (35 - consc) / 100, 2),
                        "source": "personality_quiz",
                    })

                # High Conscientiousness → protective factor (negative weight)
                if consc >= 70:
                    factors.append({
                        "factor": f"Strong self-discipline — protective ({archetype})",
                        "weight": round(-0.15, 2),
                        "source": "personality_quiz",
                    })

                # High Agreeableness + Extraversion → social support protective
                agree = scores.get("agreeableness", 50)
                extra = scores.get("extraversion", 50)
                if agree >= 60 and extra >= 55:
                    factors.append({
                        "factor": "Strong social support network (high Agreeableness + Extraversion)",
                        "weight": round(-0.1, 2),
                        "source": "personality_quiz",
                    })

        return factors

    # ── Phase 1 Clinical Baselines ───────────────────────────────

    def _calculate_ada_t2d_risk(
        self,
        history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]],
    ) -> float:
        """
        Calculates a baseline Type 2 Diabetes risk score proxy based on ADA guidelines.
        Uses age, BMI (if implicitly derivable or statically 25 for demo), and family history.
        """
        score = 0.0
        # Age
        birth_year = (profile or {}).get("birthYear") or (profile or {}).get("birth_year")
        age = datetime.utcnow().year - int(birth_year) if birth_year else 40
        if age >= 60: score += 30
        elif age >= 50: score += 20
        elif age >= 40: score += 10
        
        # Family History proxy (from traits/profile)
        if profile and profile.get("family_history_t2d"):
            score += 25
            
        # Very simple glucose trajectory bump
        glucose_metrics = [m.get("value", 100) for m in history if m.get("metric_type") == "glucose"]
        if glucose_metrics and max(glucose_metrics) > 115:
            score += 35  # Prediabetes threshold bump
            
        return min(100.0, score)

    def _calculate_aha_hypertension_risk(
        self,
        history: List[Dict[str, Any]],
        profile: Optional[Dict[str, Any]],
    ) -> float:
        """
        Calculates a baseline Hypertension risk score proxy based on ACC/AHA indicators.
        Uses resting HR, HRV trends, and age.
        """
        score = 0.0
        birth_year = (profile or {}).get("birthYear") or (profile or {}).get("birth_year")
        age = datetime.utcnow().year - int(birth_year) if birth_year else 40
        if age >= 55: score += 15
        
        hr_metrics = [m.get("value", 70) for m in history if m.get("metric_type") in ("resting_heart_rate", "heart_rate")]
        if hr_metrics:
            recent_hr = sum(hr_metrics[-3:]) / min(len(hr_metrics[-3:]), 3)
            if recent_hr > 80: score += 20
            if recent_hr > 90: score += 25
            
        hrv_metrics = [m.get("value", 50) for m in history if m.get("metric_type") == "heart_rate_variability"]
        if hrv_metrics and sum(hrv_metrics) / len(hrv_metrics) < 30:
            score += 25  # Low HRV is a strong sympathetic tone indicator
            
        return min(100.0, score)

    def _generate_recommendations(
        self,
        risk_score: float,
        trend: str,
        factors: List[Dict[str, Any]],
    ) -> List[str]:
        recs: List[str] = []
        if risk_score >= 55:
            recs.append("Schedule a check-up with your healthcare provider to discuss recent trends.")
        if trend == "declining":
            recs.append("Your metrics have been trending in a concerning direction. Aim for consistency in sleep and activity.")
        if any(f["factor"] == "High metric volatility" for f in factors):
            recs.append("Large swings detected in your data. Try logging at the same time each day for better accuracy.")
        if any("stress" in f["factor"].lower() for f in factors):
            recs.append("Consider incorporating stress-management techniques such as mindfulness or breathing exercises.")
        if not recs:
            recs.append("Looking good — keep maintaining your current healthy habits.")
        return recs

    def _member_to_metrics(self, member: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Convert a family-member dict (from genealogy) into a list of
        pseudo-metric readings so predict_user() can process them.
        """
        metrics: List[Dict[str, Any]] = []
        traits = member.get("traits", member.get("aiPersonality", {}).get("traits", []))

        # Synthesize wellness score from traits
        base_score = 50
        if isinstance(traits, list):
            for t in traits:
                t_lower = str(t).lower()
                if any(kw in t_lower for kw in ["active", "healthy", "athletic", "resilient"]):
                    base_score -= 5
                elif any(kw in t_lower for kw in ["anxious", "stressed", "sedentary"]):
                    base_score += 8

        # ── Adjust baseline using personality quiz OCEAN scores ──
        member_id = member.get("id", "")
        pq = _personality()
        if pq and member_id:
            quiz_profile = pq.get_profile(member_id)
            if quiz_profile:
                scores = quiz_profile.get("scores", {})
                # High neuroticism raises wellness risk
                neuro = scores.get("neuroticism", 50)
                if neuro >= 60:
                    base_score += int((neuro - 50) * 0.15)
                # High conscientiousness lowers risk
                consc = scores.get("conscientiousness", 50)
                if consc >= 60:
                    base_score -= int((consc - 50) * 0.1)

        # Generate 7 pseudo-daily readings with slight jitter
        now = datetime.utcnow()
        for i in range(7):
            jitter = random.uniform(-3, 3)
            metrics.append({
                "metric_type": "wellness_composite",
                "value": round(base_score + jitter, 1),
                "date": (now - timedelta(days=6 - i)).strftime("%Y-%m-%d"),
            })
        return metrics

    def _deduplicate_factors(self, factors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen: Dict[str, Dict[str, Any]] = {}
        for f in factors:
            key = f.get("factor", "")
            if key not in seen:
                seen[key] = f
            else:
                # Keep the higher weight
                if f.get("weight", 0) > seen[key].get("weight", 0):
                    seen[key] = f
        return sorted(seen.values(), key=lambda x: x.get("weight", 0), reverse=True)

    def _scenario_narrative(
        self,
        scenarios: List[Dict[str, Any]],
        outcomes: Dict[str, float],
        changes: Dict[str, str],
    ) -> str:
        parts: List[str] = []
        for sc in scenarios:
            metric = sc.get("metric", "metric")
            direction = sc.get("change_type", "maintain")
            duration = sc.get("duration_days", 30)
            outcome_val = outcomes.get(metric, 0)
            change_label = changes.get(metric, "unchanged")

            parts.append(
                f"If you {direction} {metric.replace('_', ' ')} for {duration} days, "
                f"your projected value is {outcome_val:.0f} ({change_label})."
            )
        return " ".join(parts) if parts else "No significant projected changes."


# ── Singleton ────────────────────────────────────────────────────

shared_predictor = SharedHealthPredictor()
