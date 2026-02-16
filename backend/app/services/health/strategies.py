from app.services.health.core import HealthAnalysisStrategy, HealthData, HealthReport
from typing import Dict, Any, List

class StandardHeartRateStrategy(HealthAnalysisStrategy):
    """
    Standard analysis for general population.
    60-100 BPM is normal.
    """
    async def analyze(self, data: HealthData) -> HealthReport:
        bpm = data.value
        status = "normal"
        risk_score = 0.0
        recommendations = []

        if bpm < 60:
            status = "warning"
            summary = "Bradycardia detected (Low Heart Rate)"
            risk_score = 0.4
            recommendations.append("Monitor for dizziness or fatigue.")
        elif bpm > 100:
            status = "warning"
            summary = "Tachycardia detected (High Heart Rate)"
            risk_score = 0.6
            recommendations.append("Rest and re-measure. Consider stress or caffeine intake.")
        else:
            summary = "Heart rate within normal range."
            risk_score = 0.1

        return HealthReport(
            status=status,
            summary=summary,
            metrics_analyzed=["heart_rate"],
            risk_score=risk_score,
            recommendations=recommendations,
            metadata={"strategy": "StandardHeartRateStrategy", "thresholds": "60-100"}
        )

class AthleteHeartRateStrategy(HealthAnalysisStrategy):
    """
    Analysis tailored for athletes.
    40-100 BPM is normal (lower resting HR is expected).
    """
    async def analyze(self, data: HealthData) -> HealthReport:
        bpm = data.value
        status = "normal"
        risk_score = 0.0
        recommendations = []

        if bpm < 40:
            status = "warning"
            summary = "Extremely low heart rate, even for an athlete."
            risk_score = 0.3
            recommendations.append("Ensure no symptoms of fainting.")
        elif bpm > 100:
            status = "warning"
            summary = "Elevated resting heart rate."
            risk_score = 0.5
            recommendations.append("Check for overtraining or dehydration.")
        else:
            summary = "Heart rate optimal for athletic conditioning."
            risk_score = 0.05

        return HealthReport(
            status=status,
            summary=summary,
            metrics_analyzed=["heart_rate"],
            risk_score=risk_score,
            recommendations=recommendations,
            metadata={"strategy": "AthleteHeartRateStrategy", "thresholds": "40-100"}
        )

class GlucoseStrategy(HealthAnalysisStrategy):
    """
    Analysis for blood glucose levels.
    """
    async def analyze(self, data: HealthData) -> HealthReport:
        level = data.value
        # Assuming mg/dL for simplicity
        status = "normal"
        risk_score = 0.0
        recommendations = []

        if level < 70:
            status = "critical"
            summary = "Hypoglycemia detected."
            risk_score = 0.9
            recommendations.append("Consume fast-acting carbohydrates immediately.")
        elif level > 180:
            status = "warning"
            summary = "Hyperglycemia detected."
            risk_score = 0.7
            recommendations.append("Monitor levels and hydration. Verify insulin if applicable.")
        else:
            summary = "Glucose levels stable."
            risk_score = 0.1

        return HealthReport(
            status=status,
            summary=summary,
            metrics_analyzed=["glucose"],
            risk_score=risk_score,
            recommendations=recommendations,
            metadata={"strategy": "GlucoseStrategy", "units": "mg/dL"}
        )

# --- Prediction Strategies (The Prophet) ---

from app.services.health.core import HealthPredictionStrategy, PredictionResult, PredictionPoint
from app.services.health.delphi_model import DelphiModel, DelphiConfig
from app.ai.llm_client import get_llm_client
import torch
from datetime import datetime, timedelta
import random

class MetabolicTrendStrategy(HealthPredictionStrategy):
    """
    Predicts glucose stability using GMI and Time-in-Range (TIR).
    Formula: GMI = 3.31 + (0.02392 * mean_glucose_mgdl)
    """
    async def predict(self, user_id: str, context_data: Dict[str, Any]) -> PredictionResult:
        # Context data should contain 'recent_glucose_readings'
        readings = context_data.get("recent_glucose_readings", [])
        
        if not readings:
            return PredictionResult(
                prediction_type="metabolic_stability",
                predicted_value=0.0,
                confidence=0.0,
                horizon="24h",
                risk_level="unknown",
                contributing_factors=["insufficient_data"]
            )

        # Calculate Mean Glucose
        mean_glucose = sum(readings) / len(readings)
        
        # Calculate GMI (Glucose Management Indicator)
        # GMI approximates A1C
        gmi = 3.31 + (0.02392 * mean_glucose)
        
        # Determine Risk
        risk_level = "low"
        if gmi > 7.0: # Approx A1C > 7%
            risk_level = "moderate"
        if gmi > 8.5:
            risk_level = "high"

        return PredictionResult(
            prediction_type="metabolic_stability",
            predicted_value=gmi,
            confidence=0.85, # Simplification
            horizon="30d_trend",
            risk_level=risk_level,
            contributing_factors=[f"Mean Glucose: {mean_glucose:.0f}", "TIR Analysis"]
        )

class PhysicalReadinessStrategy(HealthPredictionStrategy):
    """
    Predicts daily fatigue/readiness using HRV, Resting HR, and Sleep.
    """
    async def predict(self, user_id: str, context_data: Dict[str, Any]) -> PredictionResult:
        hrv = context_data.get("hrv", 50) # ms
        rhr = context_data.get("resting_hr", 60) # bpm
        sleep_eff = context_data.get("sleep_efficiency", 85) # %

        # Readiness Score Calculation (Simplified Oura/Whoop style)
        # Higher HRV = Good, Lower RHR = Good, High Sleep = Good
        
        # Normalize inputs (0-100 scale approximations)
        hrv_score = min(100, (hrv / 100) * 100)
        rhr_score = min(100, max(0, 100 - (rhr - 40) * 1.5)) # 40bpm=100, 106bpm=0
        sleep_score = sleep_eff

        readiness = (hrv_score * 0.4) + (rhr_score * 0.3) + (sleep_score * 0.3)
        
        risk = "low"
        if readiness < 50:
            risk = "high"
        elif readiness < 70:
            risk = "moderate"

        return PredictionResult(
            prediction_type="physical_readiness",
            predicted_value=readiness,
            confidence=0.9,
            horizon="24h",
            risk_level=risk,
            contributing_factors=[f"HRV: {hrv}", f"RHR: {rhr}", f"Sleep Eff: {sleep_eff}%"]
        )

class DelphiPredictionStrategy(HealthPredictionStrategy):
    """
    Predicts health trajectories using a generative transformer model (Delphi-inspired).
    """
    def __init__(self):
        self.config = DelphiConfig(n_layer=4, n_head=4, n_embd=128) # Smaller for local execution
        self.model = DelphiModel(self.config)
        self.llm = get_llm_client()

    async def predict(self, user_id: str, context_data: Dict[str, Any]) -> PredictionResult:
        # Context data should contain 'metrics_history'
        history = context_data.get("metrics_history", [])
        
        if not history:
            return PredictionResult(
                prediction_type="delphi_trajectory",
                predicted_value=0.0,
                confidence=0.0,
                horizon="long-term",
                risk_level="unknown",
                contributing_factors=["insufficient_historical_data"]
            )

        # Delphi-specific trajectory mapping
        # In a real scenario, we'd map heart_rate, glucose, etc., to ICD tokens or specific embeddings
        trajectory_str = self._format_trajectory(history)
        
        # Ideation via LLM (Ollama) supported by the Delphi context
        system_prompt = (
            "You are St. Raphael, an advanced health AI using the Delphi generative transformer model. "
            "Your goal is to predict health trajectories based on provided metrics. "
            "Interpret the following trajectory and provide a predictive insight."
        )
        
        user_prompt = f"Health Trajectory History:\n{trajectory_str}\n\nPredict the next likely state and identify specific risk factors."
        
        response = await self.llm.generate_response(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt
        )

        # Generate a synthetic trajectory for the dashboard (Phase 3)
        # In production, this would be the output of the Delphi transformer model
        trajectory = []
        base_time = datetime.utcnow()
        current_val = 0.5 # Start at moderate risk/health index
        
        for i in range(24): # 24 hour prediction
            ts = base_time + timedelta(hours=i)
            # Add some "biological" randomness/trend
            current_val += random.uniform(-0.05, 0.05)
            current_val = max(0.1, min(0.9, current_val))
            trajectory.append(PredictionPoint(
                timestamp=ts,
                value=current_val,
                confidence=0.8 - (i * 0.01) # Confidence decays over time
            ))

        return PredictionResult(
            prediction_type="delphi_trajectory",
            predicted_value=current_val,
            confidence=0.8,
            horizon="24h",
            risk_level="low",
            contributing_factors=[response[:200] + "..."],
            trajectory=trajectory
        )

    def _format_trajectory(self, history: List[Dict[str, Any]]) -> str:
        formatted = []
        for entry in history:
            ts = entry.get("timestamp", "")
            m_type = entry.get("type", "unknown")
            val = entry.get("value", 0)
            formatted.append(f"[{ts}] {m_type}: {val}")
        return "\n".join(formatted)
