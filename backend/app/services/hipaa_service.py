"""
HIPAA Compliance Service

Implements HIPAA §164.312(b) Audit Controls and §164.308 Security Management
on behalf of St. Michael (Security Officer) and St. Anthony (Auditor).

This service:
  - Logs every PHI access event (who, what data, when, which saint/context)
  - Provides structured compliance reports
  - Checks minimum-necessary data access rules
  - Gives St. Anthony read access to the access log
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# PHI data-type categories per HIPAA §164.514(b)(2)
PHI_DATA_TYPES = {
    "demographics": ["name", "address", "phone", "email", "birth_date", "age", "zip"],
    "identifiers": ["ssn", "mrn", "health_plan_id", "account_number", "certificate", "device_id"],
    "biometrics": ["heart_rate", "blood_pressure", "blood_glucose", "bmi", "weight", "steps", "sleep"],
    "clinical": ["diagnosis", "medication", "prescription", "icd_code", "cpt_code", "allergy", "condition", "symptom", "lab_result"],
    "financial": ["payment", "insurance", "premium", "claim"],
}

# Flatten to a quick lookup set
_ALL_PHI_KEYWORDS = {kw for keywords in PHI_DATA_TYPES.values() for kw in keywords}

# Storage: in-memory log + optional JSON persistence
_LOG_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "hipaa_access_log.json"
)


class HIPAAService:
    """
    HIPAA Audit Control and Security Management service.

    Designated saints:
      - St. Michael  → HIPAA Security Rule §164.308–164.316 (Protector)
      - St. Anthony  → HIPAA Audit Controls §164.312(b) (Auditor)
    """

    def __init__(self):
        self._log: List[Dict[str, Any]] = self._load_log()

    # ------------------------------------------------------------------
    # Log persistence
    # ------------------------------------------------------------------

    def _load_log(self) -> List[Dict[str, Any]]:
        try:
            with open(_LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_log(self):
        try:
            os.makedirs(os.path.dirname(_LOG_FILE), exist_ok=True)
            with open(_LOG_FILE, "w", encoding="utf-8") as f:
                json.dump(self._log[-2000:], f, indent=2)  # Keep last 2000 events
        except Exception as e:
            logger.warning(f"[HIPAA] Could not persist access log: {e}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def log_phi_access(
        self,
        user_id: str,
        saint_id: str,
        action: str,
        data_types: List[str],
        context: Optional[str] = None,
        outcome: str = "allowed",
    ) -> Dict[str, Any]:
        """
        Record a PHI access event.

        Parameters
        ----------
        user_id   : The user whose PHI is being accessed.
        saint_id  : Which saint / service is accessing the data.
        action    : Human-readable action description (e.g. "read_health_metrics").
        data_types: List of PHI categories touched (use PHI_DATA_TYPES keys).
        context   : Optional free-text context.
        outcome   : "allowed", "denied", or "flagged".
        """
        event = {
            "event_id": f"phi-{len(self._log) + 1:06d}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "saint_id": saint_id,
            "action": action,
            "data_types": data_types,
            "context": context,
            "outcome": outcome,
            "hipaa_rule": "§164.312(b) Audit Controls",
        }
        self._log.append(event)
        self._save_log()
        logger.info(f"[HIPAA] {outcome.upper()} | {saint_id} → {action} | user={user_id[:8]}...")
        return event

    def get_access_log(
        self,
        user_id: Optional[str] = None,
        saint_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Return recent PHI access events, filterable by user or saint.
        Used by St. Anthony to audit the log.
        """
        log = self._log
        if user_id:
            log = [e for e in log if e.get("user_id") == user_id]
        if saint_id:
            log = [e for e in log if e.get("saint_id") == saint_id]
        return list(reversed(log[-limit:]))

    def check_minimum_necessary(
        self,
        saint_id: str,
        requested_fields: List[str],
        purpose: str,
    ) -> Dict[str, Any]:
        """
        Evaluate whether the requested PHI fields comply with the
        HIPAA Minimum Necessary Standard §164.514(d).

        Returns a compliance result with any flags.
        """
        # Health saints are permitted to access clinical + biometric data
        PERMITTED_BY_SAINT: Dict[str, List[str]] = {
            "raphael": ["biometrics", "clinical", "demographics"],
            "michael": ["identifiers", "demographics"],       # security audit only
            "anthony": ["identifiers", "demographics"],       # audit trail only
            "joseph":  ["demographics"],                      # family coordination
            "gabriel": ["financial", "demographics"],         # finance
        }

        permitted_categories = PERMITTED_BY_SAINT.get(saint_id, [])
        permitted_keywords = {
            kw
            for cat in permitted_categories
            for kw in PHI_DATA_TYPES.get(cat, [])
        }

        violations = [f for f in requested_fields if f.lower() not in permitted_keywords]

        compliant = len(violations) == 0
        result = {
            "saint_id": saint_id,
            "purpose": purpose,
            "requested_fields": requested_fields,
            "permitted_categories": permitted_categories,
            "violations": violations,
            "compliant": compliant,
            "hipaa_rule": "§164.514(d) Minimum Necessary",
            "recommendation": (
                "Access compliant with minimum-necessary standard."
                if compliant
                else f"Fields {violations} exceed {saint_id}'s permitted data scope. St. Michael recommends restricting access."
            ),
        }
        if not compliant:
            self.log_phi_access(
                user_id="system",
                saint_id=saint_id,
                action=f"minimum_necessary_violation:{purpose}",
                data_types=violations,
                context=f"Requested {requested_fields}",
                outcome="flagged",
            )
        return result

    def get_compliance_report(self, user_id: str) -> Dict[str, Any]:
        """
        Generate a structured HIPAA compliance posture report.
        St. Michael presents this; St. Anthony verifies the audit trail.
        """
        user_log = [e for e in self._log if e.get("user_id") == user_id]
        flagged = [e for e in user_log if e.get("outcome") == "flagged"]
        denied  = [e for e in user_log if e.get("outcome") == "denied"]

        # Compute score: 100 - 10 pts per flagged, -5 per denied
        base_score = 100
        score = max(0, base_score - len(flagged) * 10 - len(denied) * 5)

        safeguards = [
            {
                "rule": "§164.308 — Administrative Safeguards",
                "officer": "St. Michael",
                "status": "active",
                "description": "Security officer designated. Access policies enforced.",
            },
            {
                "rule": "§164.312(b) — Audit Controls",
                "officer": "St. Anthony",
                "status": "active" if len(user_log) > 0 else "pending",
                "description": f"Access log contains {len(user_log)} PHI events for this user.",
            },
            {
                "rule": "§164.514(d) — Minimum Necessary",
                "officer": "St. Michael",
                "status": "compliant" if not flagged else "violations_detected",
                "description": f"{len(flagged)} minimum-necessary violations logged.",
            },
            {
                "rule": "§164.312(a)(1) — Access Control",
                "officer": "St. Michael",
                "status": "active",
                "description": "Role-based access enforced per saint domain permissions.",
            },
        ]

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "compliance_score": score,
            "status": "compliant" if score >= 80 else "at_risk" if score >= 50 else "non_compliant",
            "total_phi_events": len(user_log),
            "flagged_events": len(flagged),
            "denied_events": len(denied),
            "safeguards": safeguards,
            "recent_events": list(reversed(user_log[-10:])),
            "certifying_saints": {
                "security_officer": "St. Michael — §164.308(a)(2)",
                "audit_officer": "St. Anthony — §164.312(b)",
            },
        }


# Singleton
hipaa_service = HIPAAService()
