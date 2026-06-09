from enum import Enum
from typing import Dict, Any, Optional
from .core import PredictionResult

class PredictionState(Enum):
    IDLE = "idle"
    COLLECTING = "collecting_data"
    PREDICTING = "predicting"
    ALERTING = "alerting"
    COOLDOWN = "cooldown"

class HealthPredictionStateMachine:
    """
    Manages the state of the health prediction process.
    Ensures safe transitions between Collecting, Predicting, and Alerting.
    """
    def __init__(self):
        self._state = PredictionState.IDLE
        self._context_data: Dict[str, Any] = {}
        self._last_error: Optional[str] = None

    @property
    def current_state(self) -> PredictionState:
        return self._state

    def transition_to(self, new_state: PredictionState):
        """Execute safe transition logic"""
        # Simple guard clauses for valid transitions
        if self._state == PredictionState.ALERTING and new_state == PredictionState.PREDICTING:
             # Can't go back to predicting while alerting
             raise RuntimeError("Cannot switch to PREDICTING while ALERTING")
        
        print(f"[HealthStateMachine] Transition: {self._state.value} -> {new_state.value}")
        self._state = new_state

    def start_collection(self, new_data_point: Any):
        if self._state not in [PredictionState.IDLE, PredictionState.COOLDOWN]:
            # Already busy, maybe just append data?
            pass
        self.transition_to(PredictionState.COLLECTING)
        # In a real system, we might buffer data here
        # self._context_data.update(...)

    def ready_to_predict(self):
        if self._state == PredictionState.COLLECTING:
            self.transition_to(PredictionState.PREDICTING)
        else:
             raise RuntimeError("Must be COLLECTING to start PREDICTING")

    def handle_prediction_result(self, result: PredictionResult):
        if self._state != PredictionState.PREDICTING:
             # Determine if we should force a state change or error
             pass
        
        # Clinical Guardrails
        if self._check_guardrails(result):
            self.transition_to(PredictionState.ALERTING)
            # Trigger alert engine...
        else:
            self.transition_to(PredictionState.IDLE)

    def _check_guardrails(self, result: PredictionResult) -> bool:
        """
        Apply Safety Guardrails.
        Returns True if an alert state is required.
        """
        # Example 1: Urgent Low Glucose
        if result.prediction_type == "metabolic_stability":
            # GMI is ~A1C, but let's assume we also check predicted instantaneous value if available
            # or if the GMI implies dangerous levels.
            # For this example, if Risk is High, we Alert.
            if result.risk_level == "high":
                return True
        
        # Example 2: Physical Readiness
        if result.prediction_type == "physical_readiness":
            if result.predicted_value < 30: # Extremely low readiness
                return True
                
        return False

    def reset(self):
        self._state = PredictionState.IDLE
        self._context_data = {}
