from .core import HealthReportDecorator, HealthReport, HealthData
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
    Decorator (Skin) that checks for critical status and raises a REAL alert:
    an `agent_notifications` row, which the app delivers live (the frontend
    HealthAlertListener subscribes to inserts on that table and surfaces
    them immediately). The report only claims an alert went out when the
    notification row was actually written — a failed write is reported as a
    failed alert, never as success. SMS/email/push channels layer on top of
    this once those providers are wired.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)

        if report.status == "critical" or report.risk_score > 0.8:
            delivered = await self._trigger_alert(data, report)
            if delivered:
                report.summary = f"[ALERT RAISED] {report.summary}"
                report.metadata["alert_triggered"] = True
                report.metadata["alert_channel"] = "in_app"
            else:
                report.summary = f"[ALERT DELIVERY FAILED] {report.summary}"
                report.metadata["alert_triggered"] = False
                report.metadata["alert_error"] = (
                    "The critical-alert notification could not be recorded. "
                    "Treat this reading as unalerted and check on the user directly."
                )

        return report

    async def _trigger_alert(self, data: HealthData, report: HealthReport) -> bool:
        logger.critical(f"CRITICAL HEALTH ALERT: {report.summary}")
        try:
            from app.db import session as db_session
            from app.models.agent import AgentNotification

            if db_session.AsyncSessionLocal is None:
                logger.error("Alert dispatch failed: database session factory not initialized.")
                return False

            async with db_session.AsyncSessionLocal() as session:
                notification = AgentNotification(
                    user_id=data.user_id,
                    notification_type="critical_health_alert",
                    title=f"Critical health alert: {data.metric_type}",
                    message=report.summary,
                    priority="urgent",
                    is_actionable=True,
                )
                session.add(notification)
                await session.commit()
            return True
        except Exception:
            logger.exception("Alert dispatch failed while recording the notification row.")
            return False


class PrivacyDecorator(HealthReportDecorator):
    """
    Decorator (Skin) that anonymizes or encrypts sensitive parts of the report depending on context.
    """
    async def generate_report(self, data: HealthData) -> HealthReport:
        report = await self.wrapped.generate_report(data)

        # Real, verifiable transformation only: strip direct identifiers from
        # the export-facing metadata. No unearned "encrypted/compliant"
        # claims — transport encryption is TLS at the edge, and compliance is
        # asserted by audit, not by a flag set here.
        report.metadata.pop("user_id", None)
        report.metadata["identifiers_redacted"] = True

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
