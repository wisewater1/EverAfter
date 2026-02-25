"""
Evidence Ledger for Health Causal Twin.
Immutable append-only audit trail for every recommendation and prediction.
"""
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime


class EvidenceLedger:
    """
    Append-only provenance store for recommendations.
    Every recommendation includes data sources, model version, confidence,
    evidence type, and failure history.
    """

    def __init__(self):
        # In-memory store for prototyping (production: use DB models)
        self._entries: List[Dict[str, Any]] = []

    def record_recommendation(
        self,
        user_id: str,
        recommendation_text: str,
        data_sources: List[str],
        confidence: float,
        evidence_type: str,
        model_version: str = "v1.0.0",
        failure_history: Optional[List[str]] = None,
        related_experiment_id: Optional[str] = None,
        related_prediction_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Record a new recommendation in the immutable ledger."""
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "recommendation_text": recommendation_text,
            "data_sources": data_sources,
            "model_version": model_version,
            "confidence": round(confidence, 1),
            "evidence_type": evidence_type,
            "failure_history": failure_history or [],
            "contradictions": [],
            "related_experiment_id": related_experiment_id,
            "related_prediction_id": related_prediction_id,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }

        self._entries.append(entry)
        return entry

    def add_failure(self, entry_id: str, failure_note: str) -> Optional[Dict[str, Any]]:
        """Record a failure for an existing recommendation (append-only)."""
        for entry in self._entries:
            if entry["id"] == entry_id:
                entry["failure_history"].append({
                    "note": failure_note,
                    "recorded_at": datetime.utcnow().isoformat()
                })
                return entry
        return None

    def add_contradiction(self, entry_id: str, contradiction: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Record contradicting evidence against a recommendation."""
        for entry in self._entries:
            if entry["id"] == entry_id:
                entry["contradictions"].append({
                    **contradiction,
                    "detected_at": datetime.utcnow().isoformat()
                })
                return entry
        return None

    def get_audit_trail(
        self,
        user_id: str,
        limit: int = 50,
        evidence_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get the recommendation audit trail for a user."""
        entries = [e for e in self._entries if e["user_id"] == user_id]

        if evidence_type:
            entries = [e for e in entries if e["evidence_type"] == evidence_type]

        # Sort by creation time (newest first)
        entries.sort(key=lambda e: e["created_at"], reverse=True)
        return entries[:limit]

    def get_entry_detail(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get the full 'Why this recommendation?' detail."""
        for entry in self._entries:
            if entry["id"] == entry_id:
                return {
                    **entry,
                    "why": self._explain_recommendation(entry)
                }
        return None

    def _explain_recommendation(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        """Build the 'Why this recommendation?' drill-down."""
        evidence_labels = {
            "causal_trial": "Supported by your own personal experiment",
            "strong_correlation": "Strong statistical pattern in your data",
            "weak_correlation": "Some signal detected, but data is noisy",
            "population_prior": "Based on general health research",
            "clinician_entered": "From your healthcare provider"
        }

        failures_count = len(entry.get("failure_history", []))
        contradictions_count = len(entry.get("contradictions", []))

        return {
            "evidence_explanation": evidence_labels.get(
                entry["evidence_type"], "Evidence type unknown"
            ),
            "data_sources_used": entry["data_sources"],
            "model_version": entry["model_version"],
            "confidence_percent": entry["confidence"],
            "times_this_failed": failures_count,
            "contradicting_evidence_count": contradictions_count,
            "reliability_note": self._reliability_note(
                entry["confidence"], failures_count, contradictions_count
            )
        }

    def _reliability_note(
        self, confidence: float, failures: int, contradictions: int
    ) -> str:
        if failures >= 2:
            return (
                f"⚠️ This intervention has not worked the last {failures} times. "
                "Consider an alternative approach."
            )
        if contradictions > 0:
            return (
                f"New data has weakened this recommendation. "
                f"{contradictions} contradicting observation(s) detected."
            )
        if confidence >= 80:
            return "✅ High reliability — well-supported by your personal data."
        if confidence >= 50:
            return "🟡 Moderate reliability — additional data would strengthen this."
        return "🔴 Low reliability — treat as preliminary observation."

    def compare_quality_over_time(self, user_id: str) -> Dict[str, Any]:
        """Show how recommendation quality has evolved."""
        entries = self.get_audit_trail(user_id, limit=100)
        if not entries:
            return {"entries": 0, "trend": "insufficient_data"}

        # Compute rolling average confidence
        confidences = [e["confidence"] for e in reversed(entries)]
        total = len(confidences)

        if total < 5:
            return {
                "entries": total,
                "avg_confidence": round(sum(confidences) / total, 1),
                "trend": "insufficient_data"
            }

        first_half = confidences[:total // 2]
        second_half = confidences[total // 2:]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)

        if avg_second > avg_first + 3:
            trend = "improving"
        elif avg_second < avg_first - 3:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "entries": total,
            "avg_confidence_early": round(avg_first, 1),
            "avg_confidence_recent": round(avg_second, 1),
            "trend": trend
        }


evidence_ledger = EvidenceLedger()
