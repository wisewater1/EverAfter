from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

# --- Data Structures ---

@dataclass
class HealthData:
    """Raw health data input"""
    metric_type: str
    value: float
    unit: str
    user_id: str
    timestamp: datetime
    metadata: Dict[str, Any] = None

@dataclass
class HealthReport:
    """Processed health report"""
    status: str  # 'normal', 'warning', 'critical'
    summary: str
    metrics_analyzed: List[str]
    risk_score: float
    recommendations: List[str]
    metadata: Dict[str, Any]

# --- Strategy Pattern (The Guts) ---

class HealthAnalysisStrategy(ABC):
    """
    Interface for health analysis algorithms.
    Strategies define HOW data is processed (e.g., Athlete vs. Sedentary logic).
    """
    @abstractmethod
    async def analyze(self, data: HealthData) -> HealthReport:
        pass

@dataclass
class PredictionResult:
    """Output of a predictive model"""
    prediction_type: str
    predicted_value: float
    confidence: float
    horizon: str  # e.g., "4h", "24h"
    risk_level: str
    contributing_factors: List[str]

class HealthPredictionStrategy(ABC):
    """
    Interface for predictive health models.
    Uses historical data to forecast future states.
    """
    @abstractmethod
    async def predict(self, user_id: str, context_data: Dict[str, Any]) -> PredictionResult:
        pass

# --- Decorator Pattern (The Skin) ---

class HealthReportComponent(ABC):
    """
    Component interface for the Decorator pattern.
    Defines the contract for objects that can produce or modify a HealthReport.
    """
    @abstractmethod
    async def generate_report(self, data: HealthData) -> HealthReport:
        pass

class BaseHealthReporter(HealthReportComponent):
    """
    The 'Concrete Component' in Decorator pattern.
    This uses a Strategy to generate the initial report.
    """
    def __init__(self, strategy: HealthAnalysisStrategy):
        self.strategy = strategy

    async def generate_report(self, data: HealthData) -> HealthReport:
        return await self.strategy.analyze(data)

class HealthReportDecorator(HealthReportComponent):
    """
    Base Decorator.
    Wraps a HealthReportComponent to add functionality.
    """
    def __init__(self, wrapped: HealthReportComponent):
        self.wrapped = wrapped

    async def generate_report(self, data: HealthData) -> HealthReport:
        return await self.wrapped.generate_report(data)

# --- Context (The Manager) ---

class HealthContext:
    """
    Manages the execution context.
    Selects the right Strategy and applies necessary Decorators.
    """
    def __init__(self, strategy: HealthAnalysisStrategy = None):
        self._strategy = strategy

    @property
    def strategy(self) -> HealthAnalysisStrategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: HealthAnalysisStrategy) -> None:
        self._strategy = strategy

    async def execute_analysis(self, data: HealthData, decorators: List[type] = None) -> HealthReport:
        if not self._strategy:
            raise ValueError("No analysis strategy set")

        # 1. Create Base Component with selected Strategy
        usage = BaseHealthReporter(self._strategy)
        
        # 2. Wrap with Decorators (if any)
        # Note: Decorators are applied in order, so the last one in list is the "outermost"
        report_component = usage
        if decorators:
            for DecoratorClass in decorators:
                report_component = DecoratorClass(report_component)

        # 3. Execute
        return await report_component.generate_report(data)
