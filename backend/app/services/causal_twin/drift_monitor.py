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
        """
        Current model status for a user.

        A user with no recorded state gets "unmonitored" and no accuracy at all.
        This used to seed 0.82 plus a random offset and an evaluated-prediction
        count between 20 and 100, which the UI then showed as a measured
        percentage for a model that is not running.
        """
        if user_id not in self._model_states:
            self._model_states[user_id] = {
                "status": "unmonitored",
                "accuracy": None,
                "last_checked": None,
                "predictions_evaluated": 0,
                "last_drift_event": None,
                "recalibrating_since": None
            }

        state = self._model_states[user_id]

        return {
            "status": state["status"],
            "accuracy": round(state["accuracy"], 3) if state.get("accuracy") is not None else None,
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
            "recalibrating": "Model is actively recalibrating to adapt to your new patterns.",
            "unmonitored": (
                "No prediction accuracy has been measured for this person yet, so "
                "there is nothing to report."
            ),
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
        baseline_accuracy = state.get("accuracy")

        # Only a real comparison of predictions against actuals produces an
        # accuracy figure. Without both, this reports that it cannot tell rather
        # than inventing a fluctuation, which is what it did before: it drew
        # baseline plus random.uniform(-0.08, 0.04) and could then announce to
        # the user that their accuracy had dropped, quoting both numbers.
        if not (recent_predictions and recent_actuals):
            return {
                "drift_detected": False,
                "current_accuracy": None,
                "monitored": False,
                "message": (
                    "No prediction accuracy has been measured for this person yet, "
                    "so drift cannot be assessed."
                ),
            }

        correct = sum(
            1 for p, a in zip(recent_predictions, recent_actuals)
            if abs(p.get("value", 0) - a.get("value", 0)) < a.get("tolerance", 5)
        )
        current_accuracy = correct / max(len(recent_predictions), 1)
        current_accuracy = max(0, min(1, current_accuracy))

        if baseline_accuracy is None:
            # First real measurement establishes the baseline; nothing to
            # compare against, so no drift can be claimed yet.
            state = self._model_states.setdefault(user_id, {})
            state["accuracy"] = current_accuracy
            state["last_checked"] = datetime.utcnow().isoformat()
            self._accuracy_history.setdefault(user_id, []).append({
                "accuracy": round(current_accuracy, 3),
                "timestamp": datetime.utcnow().isoformat(),
            })
            return {
                "drift_detected": False,
                "current_accuracy": round(current_accuracy, 3),
                "monitored": True,
                "message": "First accuracy measurement recorded. No baseline to compare against yet.",
            }

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
        self, user_id: str, old_accuracy: Optional[float], new_accuracy: Optional[float]
    ) -> Dict[str, Any]:
        """
        Record a drift event and trigger recalibration.

        Accuracies are optional, because a person may be recalibrated before any
        real measurement exists. They are carried through as null rather than
        being defaulted, so a reader can tell "not measured" from "measured low".
        """
        event = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "trigger": "accuracy_drop",
            "metric_affected": "overall",
            "old_accuracy": round(old_accuracy, 3) if old_accuracy is not None else None,
            "new_accuracy": round(new_accuracy, 3) if new_accuracy is not None else None,
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
            # accuracy stays None. The default used to be 0.82, so recalibrating
            # a person who had never been measured invented a baseline and then
            # reported it back as their old accuracy.
            state = {"accuracy": None, "predictions_evaluated": 0}
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
        # Accuracy is left as it was. This previously added a random 5 to 12
        # points, so finishing recalibration appeared to improve the model
        # without a single new observation being evaluated.
        state["last_checked"] = datetime.utcnow().isoformat()

        # Mark latest drift event as completed
        for event in reversed(self._drift_events):
            if event["user_id"] == user_id and event["status"] == "recalibrating":
                event["status"] = "resolved"
                event["recalibration_completed_at"] = datetime.utcnow().isoformat()
                break

        accuracy = state.get("accuracy")
        return {
            "status": "stable",
            "new_accuracy": round(accuracy, 3) if accuracy is not None else None,
            "message": (
                "Recalibration complete. Model has adapted to your current patterns."
                if accuracy is not None
                else "Recalibration complete. No accuracy has been measured yet, so none is reported."
            ),
        }

    def _get_accuracy_trend(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent accuracy data points for trend visualization."""
        # Empty when nothing has been measured. This used to backfill thirty
        # days of points around 0.82, which the panel drew as a real trend line.
        return self._accuracy_history.get(user_id, [])[-30:]

    def get_drift_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all drift events for a user."""
        return [e for e in self._drift_events if e["user_id"] == user_id]


drift_monitor = DriftMonitor()
