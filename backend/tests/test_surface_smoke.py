from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.api.causal_twin import get_next_measurements
from app.api.finance import get_bank_connection_status, get_wisegold_wallet_info
from app.api.genealogy import get_family_tree
from app.api.invitations import InvitationCreateRequest, create_invitation
from app.api.monitoring import get_system_status
from app.api.saints import bootstrap_saint
from app.api.trinity_api import TrinitySynapseRequest, trinity_synapse


def test_fastapi_app_import_smoke():
    from app.main import app

    assert app is not None


class _ScalarResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class _ExecuteResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return _ScalarResult(self._items)


class _GenealogySession:
    def __init__(self, nodes, relationships):
        self._results = [_ExecuteResult(nodes), _ExecuteResult(relationships)]

    async def execute(self, _query):
        return self._results.pop(0)


@pytest.mark.asyncio
async def test_joseph_family_tree_smoke():
    session = _GenealogySession(
        nodes=[
            SimpleNamespace(
                id="node-1",
                name="Alice Example",
                gender="female",
                birth_date="1980-01-01",
                death_date=None,
                health_metrics={"bp": "normal"},
            )
        ],
        relationships=[
            SimpleNamespace(
                id="rel-1",
                from_node_id="node-1",
                to_node_id="node-2",
                relation_type="parent",
            )
        ],
    )

    result = await get_family_tree(session=session, current_user={"id": "user-1"})

    assert result["nodes"][0]["name"] == "Alice Example"
    assert result["relationships"][0]["relationType"] == "parent"


@pytest.mark.asyncio
async def test_raphael_next_measurements_smoke(monkeypatch):
    async def fake_context(_session, _user_id):
        return {
            "available_data": ["hrv_wearable", "sleep_journal"],
            "weak_predictions": ["energy"],
        }

    monkeypatch.setattr("app.api.causal_twin._derive_measurement_context", fake_context)
    monkeypatch.setattr(
        "app.api.causal_twin.measurement_recommender.rank_measurements",
        lambda **_kwargs: [{"metric": "sleep_quality", "priority": 0.91}],
    )

    result = await get_next_measurements(
        member_id=None,
        current_user={"id": "user-1"},
        session=object(),
    )

    assert result["measurement_context"]["available_data"] == ["hrv_wearable", "sleep_journal"]
    assert result["recommendations"][0]["metric"] == "sleep_quality"


@pytest.mark.asyncio
async def test_trinity_emergency_alert_smoke():
    result = await trinity_synapse(
        TrinitySynapseRequest(
            action="emergency_alert",
            member_id="user-1",
            critical_metric="stress_level",
            critical_value=85.0,
            metrics_history=[],
            budget_envelopes=[],
            family_members=[],
        )
    )

    assert result["alert_level"] in {"warning", "critical"}
    assert result["cascade"]["raphael"]["metric"] == "stress_level"
    assert "recommended_action" in result


@pytest.mark.asyncio
async def test_michael_system_status_smoke(monkeypatch):
    async def fake_status(self):
        return {
            "michael": {"status": "healthy"},
            "gabriel": {"status": "healthy"},
            "anthony": {"status": "healthy"},
        }

    monkeypatch.setattr("app.services.monitoring_service.SaintsMonitoringService.get_system_status", fake_status)

    result = await get_system_status(current_user={"id": "user-1"}, session=object())

    assert result["michael"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_gabriel_bank_status_smoke(monkeypatch):
    async def fake_bank_status(self, user_id):
        return {"configured": True, "connected": False, "user_id": user_id}

    monkeypatch.setattr("app.services.finance_service.FinanceService.get_bank_connection_status", fake_bank_status)

    result = await get_bank_connection_status(current_user={"id": "user-1"}, session=object())

    assert result["configured"] is True
    assert result["user_id"] == "user-1"


@pytest.mark.asyncio
async def test_gabriel_wisegold_wallet_uses_id_claim(monkeypatch):
    async def fake_wallet(self, user_id):
        return {"wallet": {"balance": 0.0}, "user_id": user_id}

    monkeypatch.setattr("app.services.finance_service.FinanceService.get_wisegold_wallet", fake_wallet)

    result = await get_wisegold_wallet_info(current_user={"id": "user-1"}, session=object())

    assert result["wallet"]["balance"] == 0.0
    assert result["user_id"] == "user-1"


@pytest.mark.asyncio
async def test_saints_bootstrap_smoke(monkeypatch):
    async def fake_bootstrap(_session, user_id, saint_id):
        return {
            "saint_id": saint_id,
            "engram_id": str(uuid4()),
            "user_id": str(user_id),
            "bootstrapped_at": datetime.utcnow().isoformat(),
        }

    monkeypatch.setattr("app.api.saints.saint_agent_service.bootstrap_saint_engram", fake_bootstrap)

    result = await bootstrap_saint(
        saint_id="gabriel",
        session=object(),
        current_user={"id": str(uuid4())},
    )

    assert result["saint_id"] == "gabriel"
    assert "engram_id" in result


@pytest.mark.asyncio
async def test_invitations_create_smoke(monkeypatch):
    async def fake_create_invitation(
        self,
        engram_id,
        inviter_user_id,
        invitee_email,
        invitee_name,
        relationship=None,
        invitation_message=None,
        questions_to_answer=365,
    ):
        return {
            "invitation_id": "invite-1",
            "engram_id": "engram-1",
            "url": "https://everafterai.net/respond/token",
            "status": "pending",
            "delivery_status": "pending_config",
            "delivery_error": "SMTP is not configured for invitation delivery.",
            "invitee_email": invitee_email,
            "invitee_name": invitee_name,
            "relationship": relationship,
            "questions_to_answer": questions_to_answer,
            "inviter_user_id": inviter_user_id,
            "engram_id_input": engram_id,
            "invitation_message": invitation_message,
        }

    monkeypatch.setattr(
        "app.services.invitation_service.InvitationService.create_invitation",
        fake_create_invitation,
    )

    result = await create_invitation(
        request=InvitationCreateRequest(
            invitee_email="family@example.com",
            invitee_name="Family Member",
            relationship="child",
            questions_to_answer=120,
        ),
        current_user={"id": "user-1"},
        session=object(),
    )

    assert result["invitee_email"] == "family@example.com"
    assert result["relationship"] == "child"
    assert result["questions_to_answer"] == 120
