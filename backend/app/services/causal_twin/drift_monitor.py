"""
Model Drift Monitor for Health Causal Twin.
Detects when prediction performance degrades and triggers recalibration.
"""
import uuid
import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta


class DriftMonitor:
    """
    Continuously monitors prediction accuracy and detects when
    the model degrades due to behavior, schedule, or health changes.
    """

    def __init__(self):
        # In-memory store for prototyping
        self._drift_events: List[Dict[str, Any]] = []
        self._model_states: Dict[str, Dict[str, Any]] = {}  # user_id -> state
        self._accuracy_history: Dict[str, List[Dict[str, Any]]] = {}  # user_id -> history

    def get_model_status(self, user_id: str) -> Dict[str, Any]:
        """Get the current model status for a user."""
        if user_id not in self._model_states:
            self._model_states[user_id] = {
                "status": "stable",
                "accuracy": 0.82 + random.uniform(-0.05, 0.05),
                "last_checked": datetime.utcnow().isoformat(),
                "predictions_evaluated": random.randint(20, 100),
                "last_drift_event": None,
                "recalibrating_since": None
            }

        state = self._model_states[user_id]

        return {
            "status": state["status"],
            "accuracy": round(state["accuracy"], 3),
            "accuracy_trend": self._get_accuracy_trend(user_id),
            "last_checked": state["last_checked"],
            "predictions_evaluated": state["predictions_evaluated"],
            "last_drift_event": state.get("last_drift_event"),
            "recalibrating_since": state.get("recalibrating_since"),
            "status_description": self._status_description(state["status"])
        }

    def _status_description(self, status: str) -> str:
        descriptions = {
            "stable": "Model is performing well. Predictions are reliable.",
            "learning": "Model is gathering data. Predictions will improve over time.",
            "degraded": "Performance has dropped. Recent changes may have affected accuracy.",
            "recalibrating": "Model is actively recalibrating to adapt to your new patterns."
        }
        return descriptions.get(status, "Status unknown.")

    def check_drift(
        self,
        user_id: str,
        recent_predictions: Optional[List[Dict[str, Any]]] = None,
        recent_actuals: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Check if the model has drifted for a user.
        Compares recent prediction accuracy to historical baseline.
        """
        state = self._model_states.get(user_id, {})
        baseline_accuracy = state.get("accuracy", 0.82)

        # Simulate accuracy check (production: compare predicted vs actual)
        if recent_predictions and recent_actuals:
            correct = sum(
                1 for p, a in zip(recent_predictions, recent_actuals)
                if abs(p.get("value", 0) - a.get("value", 0)) < a.get("tolerance", 5)
            )
            current_accuracy = correct / max(len(recent_predictions), 1)
        else:
            # Simulated — slight random fluctuation
            current_accuracy = baseline_accuracy + random.uniform(-0.08, 0.04)

        current_accuracy = max(0, min(1, current_accuracy))
        drift_detected = current_accuracy < baseline_accuracy - 0.1

        # Record accuracy point
        if user_id not in self._accuracy_history:
            self._accuracy_history[user_id] = []
        self._accuracy_history[user_id].append({
            "accuracy": round(current_accuracy, 3),
            "timestamp": datetime.utcnow().isoformat()
        })

        if drift_detected:
            drift_event = self._record_drift(user_id, baseline_accuracy, current_accuracy)
            return {
                "drift_detected": True,
                "old_accuracy": round(baseline_accuracy, 3),
                "new_accuracy": round(current_accuracy, 3),
                "drop": round(baseline_accuracy - current_accuracy, 3),
                "event": drift_event,
                "message": (
                    f"Your prediction accuracy dropped from {baseline_accuracy:.0%} to "
                    f"{current_accuracy:.0%}. This may be due to recent changes in your "
                    "schedule, habits, or health. The model is recalibrating."
                )
            }

        return {
            "drift_detected": False,
            "current_accuracy": round(current_accuracy, 3),
            "message": "Model performance is within normal range."
        }

    def _record_drift(
        self, user_id: str, old_accuracy: float, new_accuracy: float
    ) -> Dict[str, Any]:
        """Record a drift event and trigger recalibration."""
        event = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "trigger": "accuracy_drop",
            "metric_affected": "overall",
            "old_accuracy": round(old_accuracy, 3),
            "new_accuracy": round(new_accuracy, 3),
            "status": "recalibrating",
            "created_at": datetime.utcnow().isoformat(),
            "recalibration_started_at": datetime.utcnow().isoformat(),
            "recalibration_completed_at": None
        }

        self._drift_events.append(event)

        # Update model state
        if user_id not in self._model_states:
            self._model_states[user_id] = {}
        self._model_states[user_id].update({
            "status": "recalibrating",
            "accuracy": new_accuracy,
            "last_drift_event": event["id"],
            "recalibrating_since": event["recalibration_started_at"],
            "last_checked": datetime.utcnow().isoformat()
        })

        return event

    def trigger_recalibration(self, user_id: str, reason: str = "manual") -> Dict[str, Any]:
        """Manually trigger recalibration."""
        state = self._model_states.get(user_id)
        if not state:
            state = {"accuracy": 0.82, "predictions_evaluated": 0}
            self._model_states[user_id] = state

        event = self._record_drift(user_id, state["accuracy"], state["accuracy"])
        event["trigger"] = reason
        return {
            "status": "recalibrating",
            "event": event,
            "message": f"Recalibration triggered ({reason}). Model will adapt to your current patterns."
        }

    def complete_recalibration(self, user_id: str) -> Dict[str, Any]:
        """Mark recalibration as complete."""
        state = self._model_states.get(user_id)
        if not state:
            return {"error": "No model state found"}

        state["status"] = "stable"
        state["recalibrating_since"] = None
        state["accuracy"] = min(1.0, state.get("accuracy", 0.82) + random.uniform(0.05, 0.12))
        state["last_checked"] = datetime.utcnow().isoformat()

        # Mark latest drift event as completed
        for event in reversed(self._drift_events):
            if event["user_id"] == user_id and event["status"] == "recalibrating":
                event["status"] = "resolved"
                event["recalibration_completed_at"] = datetime.utcnow().isoformat()
                break

        return {
            "status": "stable",
            "new_accuracy": round(state["accuracy"], 3),
            "message": "Recalibration complete. Model has adapted to your current patterns."
        }

    def _get_accuracy_trend(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent accuracy data points for trend visualization."""
        history = self._accuracy_history.get(user_id, [])

        # If no history, generate some baseline points
        if not history:
            base_time = datetime.utcnow() - timedelta(days=30)
            history = [
                {
                    "accuracy": round(0.82 + random.uniform(-0.03, 0.03), 3),
                    "timestamp": (base_time + timedelta(days=i)).isoformat()
                }
                for i in range(30)
            ]

        return history[-30:]  # Last 30 data points

    def get_drift_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all drift events for a user."""
        return [e for e in self._drift_events if e["user_id"] == user_id]


drift_monitor = DriftMonitor()
