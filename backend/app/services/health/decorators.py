from app.services.health.core import HealthReportDecorator, HealthReport, HealthData
import logging

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LoggingDecorator(HealthReportDecorator):
    """
    Decorator (Skin) that logs the report generation for audit trails.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        logger.info(f"Generating report for User {data.user_id} - Metric: {data.metric_type}")
        
        report = await self.wrapped.generate_report(data)
        
        # Log the result
        logger.info(f"Report Generated: Status={report.status}, Risk={report.risk_score}")
        
        # Add metadata to indicate this layer ran
        report.metadata["audit_logged"] = True
        return report

class SafetyAlertDecorator(HealthReportDecorator):
    """
    Decorator (Skin) that checks for critical status and triggers alerts.
    Does NOT modify the logic, just reacts to it (Skin).
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)
        
        if report.status == "critical" or report.risk_score > 0.8:
            self._trigger_alert(report)
            report.summary = f"[ALERT SENT] {report.summary}"
            report.metadata["alert_triggered"] = True
            
        return report

    def _trigger_alert(self, report: HealthReport):
        # In a real system, this would send an SMS/Email/Push Notification
        logger.critical(f"CRITICAL HEALTH ALERT: {report.summary}")
        # Placeholder for actual alert logic
        print(f"!!! DISPATCHING EMERGENCY ALERT: {report.summary} !!!")


class PrivacyDecorator(HealthReportDecorator):
    """
    Decorator (Skin) that anonymizes or encrypts sensitive parts of the report depending on context.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)
        
        # Example: if exporting, mask user ID or specific details
        # For this example, we'll just add a privacy flag
        report.metadata["encryption_applied"] = "AES-256"
        report.metadata["privacy_compliant"] = True
        
        return report

class ContextualInsightDecorator(HealthReportDecorator):
    """
    Decorator that adds therapeutic or scientific insights to the report summary.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)
        
        # Simple rule-based insights
        if data.metric_type == "glucose":
            insight = "Stable glucose is the foundation of emotional resilience."
            report.recommendations.append("Consider the emotional context of your next meal.")
        elif data.metric_type == "heart_rate":
            insight = "Your heart rhythm often mirrors your inner peace."
            report.recommendations.append("A few deep breaths can recalibrate your autonomic state.")
        else:
            insight = "Wellness is a holistic journey of small, consistent choices."
            
        report.summary = f"{report.summary} {insight}"
        report.metadata["insights_added"] = True
        return report

class TrendAnalysisDecorator(HealthReportDecorator):
    """
    Decorator that adds trend information based on recent data points.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)
        
        # In a real app, this would query historical data from the DB
        # For this prototype, we'll use a mock trend from metadata if available
        trend = data.metadata.get("trend", "stable") if data.metadata else "stable"
        
        report.metadata["trend_detected"] = trend
        report.summary = f"[{trend.upper()} TREND] {report.summary}"
        
        return report

class ActionableGuidanceDecorator(HealthReportDecorator):
    """
    Decorator that provides concrete, time-sensitive wellness tasks.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)
        
        if report.status != "normal":
            report.recommendations.insert(0, "Action Required: Prioritize rest for the next 4 hours.")
            report.metadata["urgent_action"] = True
            
        return report

class RaphaelPersonaDecorator(HealthReportDecorator):
    """
    Decorator that rephrases the report in the 'St. Raphael' therapeutic persona.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)
        
        # Therapeutic/Compassionate tone
        persona_prefix = "Dear seeker of wellness,"
        persona_suffix = "May you find balance in every breath."
        
        report.summary = f"{persona_prefix} {report.summary} {persona_suffix}"
        report.metadata["persona_applied"] = "St. Raphael"
        
        return report
