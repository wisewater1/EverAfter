from typing import List, Callable, Any
from app.services.health.core import HealthData
from app.services.health.service import health_service
from app.services.health.state_machine import HealthPredictionStateMachine
from app.services.health.strategies import MetabolicTrendStrategy, PhysicalReadinessStrategy

class HealthDataObserver:
    """
    Observer Pattern.
    Listens for new 'HealthData' and triggers the Prediction Pipeline.
    """
    def __init__(self):
        self._subscribers: List[Callable] = []
        self.state_machine = HealthPredictionStateMachine()
        
        # Instantiate strategies (Could be injected)
        self.metabolic_strategy = MetabolicTrendStrategy()
        self.physical_strategy = PhysicalReadinessStrategy()

    def on_data_ingested(self, data: HealthData):
        """
        Called when new data comes in from Connectors (Dexcom, Oura, etc.)
        """
        print(f"[HealthObserver] New Data Ingested: {data.metric_type} = {data.value}")
        
        # 1. State: Collecting
        self.state_machine.start_collection(data)
        
        # 2. State: Predicting
        # Check if we have enough context (Mocking context retrieval)
        self.state_machine.ready_to_predict()
        
        # 3. Execution
        import asyncio
        # Fire and forget / BG task in real app
        # For now we await effectively
        asyncio.create_task(self._run_prediction_pipeline(data))

    async def _run_prediction_pipeline(self, data: HealthData):
        try:
            prediction = None
            
            # Context assembly (Mocked)
            context = {
                "recent_glucose_readings": [data.value, data.value + 5, data.value - 2], # Mock
                "hrv": 55, "resting_hr": 58, "sleep_efficiency": 90 # Mock
            }

            # Select Strategy based on Data Type
            if data.metric_type == "glucose":
                prediction = await self.metabolic_strategy.predict(data.user_id, context)
            
            elif data.metric_type in ["heart_rate", "hrv", "sleep"]:
                prediction = await self.physical_strategy.predict(data.user_id, context)

            if prediction:
                print(f"[HealthObserver] Prediction Generated: {prediction.prediction_type} -> {prediction.predicted_value}")
                
                # 4. State: Alerting (if needed)
                self.state_machine.handle_prediction_result(prediction)
                
                if self.state_machine.current_state.value == "alerting":
                     print("!!! [HealthObserver] SAFETY GUARDRAIL TRIGGERED: BYPASSING CHAT !!!")
                     # Call Alert Engine (Mock)
        except Exception as e:
            print(f"[HealthObserver] Pipeline Error: {e}")
            self.state_machine.reset()

# Singleton Observer
health_observer = HealthDataObserver()
