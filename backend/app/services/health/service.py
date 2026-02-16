from app.services.health.core import HealthContext, HealthData, HealthReport, PredictionResult
from app.services.health.strategies import (
    StandardHeartRateStrategy,
    AthleteHeartRateStrategy,
    GlucoseStrategy,
    DelphiPredictionStrategy
)
from app.services.health.decorators import LoggingDecorator, SafetyAlertDecorator, PrivacyDecorator
from datetime import datetime
from typing import Dict, Any, List, Optional

class HealthLogicService:
    """
    High-level service to manage health analysis.
    This acts as the client for the Strategy/Decorator patterns.
    """

    def __init__(self):
        self.context = HealthContext()

    async def analyze_metric(
        self,
        metric_type: str,
        value: float,
        user_id: str,
        user_profile: Optional[Dict[str, Any]] = None
    ) -> HealthReport:
        
        # 1. Select Strategy (The Guts) based on context
        strategy = self._select_strategy(metric_type, user_profile)
        self.context.strategy = strategy

        # 2. Select Decorators (The Skin) based on context
        decorators = self._select_decorators(metric_type, user_profile)

        # 3. Create Data Object
        data = HealthData(
            metric_type=metric_type,
            value=value,
            unit=self._get_unit(metric_type),
            user_id=user_id,
            timestamp=datetime.utcnow(),
            metadata=user_profile or {}
        )

        # 4. Execute
        report = await self.context.execute_analysis(data, decorators)
        return report

    def _select_strategy(self, metric_type: str, profile: Optional[Dict[str, Any]]):
        """Factory logic to pick the right algorithm (Strategy)"""
        is_athlete = profile and profile.get("is_athlete", False)

        if metric_type == "heart_rate":
            if is_athlete:
                return AthleteHeartRateStrategy()
            return StandardHeartRateStrategy()
        
        if metric_type == "glucose":
            return GlucoseStrategy()

        # Default fallback
        raise ValueError(f"No strategy defined for metric: {metric_type}")

    def _select_decorators(self, metric_type: str, profile: Optional[Dict[str, Any]]) -> List[type]:
        """Factory logic to pick the right wrappers (Decorators)"""
        decorators = []

        # Always log
        decorators.append(LoggingDecorator)

        # Safety alerts for vitals
        if metric_type in ["heart_rate", "glucose", "blood_pressure"]:
            decorators.append(SafetyAlertDecorator)

        # Privacy for export (example condition)
        if profile and profile.get("export_mode", False):
            decorators.append(PrivacyDecorator)

        return decorators

    def _get_unit(self, metric_type: str) -> str:
        units = {
            "heart_rate": "bpm",
            "glucose": "mg/dL",
            "steps": "count"
        }
        return units.get(metric_type, "unit")

    async def get_predictions(
        self,
        user_id: str,
        history: List[Dict[str, Any]]
    ) -> List[PredictionResult]:
        """
        Specialized method to get health predictions using Delphi.
        """
        # Pick the Delphi strategy
        strategy = DelphiPredictionStrategy()
        
        # We can still use the context if we want, but DelphiPredictionStrategy.predict 
        # is what we need.
        context_data = {"metrics_history": history}
        
        # For now, we return a single prediction result in a list
        prediction = await strategy.predict(user_id, context_data)
        return [prediction]

# Singleton instance
health_service = HealthLogicService()
