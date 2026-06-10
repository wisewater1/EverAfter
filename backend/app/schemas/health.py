from pydantic import BaseModel
from typing import List, Tuple, Literal, Optional
from datetime import datetime

class PredictionNext7Days(BaseModel):
    expected_range: Tuple[float, float]
    risk_level: Literal['low', 'medium', 'high']

class HealthPattern(BaseModel):
    metric: str
    trend: Literal['improving', 'stable', 'declining']
    confidence: float
    prediction_next_7_days: PredictionNext7Days

class Correlation(BaseModel):
    metric_1: str
    metric_2: str
    correlation: float
    strength: Literal['strong', 'moderate', 'weak']

class AnalysisSummary(BaseModel):
    period_analyzed: str
    total_data_points: int
    metrics_analyzed: int

class AnalyticsData(BaseModel):
    analysis: AnalysisSummary
    patterns: List[HealthPattern]
    correlations: List[Correlation]
    insights: List[str]
    recommendations: List[str]
    generated_at: datetime
