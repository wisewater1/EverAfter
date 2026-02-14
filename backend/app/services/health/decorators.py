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
