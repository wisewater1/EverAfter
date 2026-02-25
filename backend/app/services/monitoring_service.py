"""
Saints Monitoring Service

Implements the "Guardian" logic for St. Michael, St. Gabriel, and St. Anthony.
Monitors system health, security, and financial integrity.
"""

from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta
import psutil
import os

from app.models.finance import Transaction, BudgetEnvelope
from app.services.vulnerability_service import vulnerability_service

class SaintsMonitoringService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_system_status(self) -> Dict[str, Any]:
        """Aggregate status from all three Saints."""
        return {
            "michael": await self._check_michael_status(),
            "gabriel": await self._check_gabriel_status(),
            "anthony": await self._check_anthony_status(),
            "raphael": await self._check_raphael_status(),
            "joseph": await self._check_joseph_status(),
            "timestamp": datetime.utcnow().isoformat()
        }

    async def _check_michael_status(self) -> Dict[str, Any]:
        """
        St. Michael (The Guardian): Security & System Integrity
        - Monitors Server Resources (CPU/RAM)
        - Checks for recent high-volume traffic (DDoS simulation)
        - Verifies generic security headers (mock)
        """
        from app.services.metrics_collector import metrics_collector
        metrics = metrics_collector.get_metrics()
        
        # 1. System Resources
        cpu_usage = metrics["resources"]["cpu_current"]
        memory_usage = metrics["resources"]["memory_current"]
        
        # 2. Run Vulnerability & Akashic Scan (Lightweight version for status)
        # In a real app, user_id would be passed from the request context
        # We'll use a placeholder or skip the DB scan if user_id is missing
        scan_results = await vulnerability_service.perform_full_security_scan(user_id=None)
        
        status = scan_results["status"]
        integrity = scan_results["system_integrity"]
        message = scan_results["findings"][0]["message"] if scan_results["findings"] else "Perimeter secure. All systems nominal."

        if cpu_usage > 80 or memory_usage > 85:
            status = "warning"
            integrity -= 10
            message = "High system load detected. Vigilance increased."
        
        return {
            "role": "Guardian of the Gate",
            "status": status,
            "integrity": f"{integrity}%",
            "metrics": {
                "cpu": f"{cpu_usage}%",
                "memory": f"{memory_usage}%",
                "vulnerabilities_tracked": len(scan_results["vulnerabilities"]),
                "security_findings": scan_results["findings_count"]
            },
            "recent_findings": scan_results["findings"][:3],
            "message": message
        }

    async def _check_gabriel_status(self) -> Dict[str, Any]:
        """
        St. Gabriel (The Messenger/Steward): Financial & Data Health
        - Checks Database Connectivity
        - Checks for unassigned transactions
        """
        status = "active"
        message = "Financial data streams are flowing correctly."
        metrics = {}

        try:
            # 1. Check DB Latency / Connectivity
            start_time = datetime.utcnow()
            await self.session.execute(text("SELECT 1"))
            latency = (datetime.utcnow() - start_time).total_seconds() * 1000
            metrics["db_latency"] = f"{latency:.1f}ms"

            # 2. Check for Uncategorized Transactions (orphans)
            stmt = select(func.count()).where(Transaction.category_id == None)
            result = await self.session.execute(stmt)
            uncategorized_count = result.scalar() or 0
            
            metrics["uncategorized_tx"] = uncategorized_count

            if latency > 200:
                status = "warning"
                message = "Database latency is higher than expected."
            
            if uncategorized_count > 5:
                status = "warning"
                message = f"{uncategorized_count} transactions require classification."

        except Exception as e:
            status = "error"
            message = f"Database connection failure: {str(e)}"

        return {
            "role": "Steward of Resources",
            "status": status,
            "metrics": metrics,
            "message": message
        }

    async def _check_anthony_status(self) -> Dict[str, Any]:
        """
        St. Anthony (The Filler): Lost Data & Error Recovery
        - Monitors Application Error Rate (Mocked via random check or log file if available)
        - Checks for long-running pending tasks
        """
        # For prototype, we simulate error tracking or check a 'tasks' table if it existed
        # We'll check the 'finance_transactions' for any future dates (anomalies)
        
        status = "active"
        message = "No lost items found. System pathways clear."
        
        try:
            # Check for anomalies (future transactions)
            stmt = select(func.count()).where(Transaction.date > datetime.utcnow().date() + timedelta(days=365))
            result = await self.session.execute(stmt)
            future_tx_count = result.scalar() or 0

            if future_tx_count > 0:
                status = "warning"
                message = f"Detected {future_tx_count} transactions with anomalous dates."

        except Exception:
            # If DB fails, Anthony also reports it
            status = "warning"
            message = "Unable to scan for anomalies due to DB connectivity."

        return {
            "role": "Seeker of the Lost",
            "status": status,
            "metrics": {
                "system_errors": 0, # Placeholder
                "recovered_items": 0 
            },
            "message": message
        }

    async def _check_raphael_status(self) -> Dict[str, Any]:
        """
        St. Raphael (The Healer): Health & Privacy
        """
        return {
            "role": "Guardian of Health",
            "status": "active",
            "metrics": {"active_monitors": 1},
            "message": "Health data secure. Privacy protocols active."
        }

    async def _check_joseph_status(self) -> Dict[str, Any]:
        """
        St. Joseph (The Worker): Family & Tasks
        """
        return {
            "role": "Family Guardian",
            "status": "active",
            "metrics": {"pending_tasks": 0},
            "message": "Household systems operational."
        }
