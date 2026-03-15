from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.wisegold_policy_service import WiseGoldPolicyService


@pytest.mark.asyncio
async def test_wisegold_policy_requires_attestation(mock_db_session):
    service = WiseGoldPolicyService(mock_db_session)
    service._get_policy_row = lambda: _async_value(SimpleNamespace(
        current_tax_rate=0.005,
        current_base_manna=0.5,
        daily_manna_pool=35762.61,
        total_circulating=1045260.91,
        stress_level=1.0,
        last_tick_velocity=3200.0,
        last_gold_delta=0.4,
        last_tick_at=None,
    ))
    service._get_wallet = lambda user_id: _async_value(SimpleNamespace(solana_pubkey=None))
    service._get_social_standing = lambda user_id, wallet_address: _async_value({
        "tier": "Trusted",
        "reputation_bps": 7800,
        "normalized_score": 0.78,
        "daily_manna_multiplier_bps": 13250,
        "governance_weight_bps": 11800,
    })
    service.sync_user_attestations = lambda user_id, wallet_address=None: _async_value([])

    result = await service.evaluate_action(user_id="user-1", action="withdraw", amount=10.0)

    assert result["allowed"] is False
    assert result["reason_code"] == "ATTESTATION_REQUIRED"


@pytest.mark.asyncio
async def test_wisegold_policy_returns_limit_for_attested_member(mock_db_session):
    covenant_id = uuid4()
    service = WiseGoldPolicyService(mock_db_session)
    service._get_policy_row = lambda: _async_value(SimpleNamespace(
        current_tax_rate=0.003,
        current_base_manna=0.6,
        daily_manna_pool=50000.0,
        total_circulating=1045260.91,
        stress_level=1.0,
        last_tick_velocity=1800.0,
        last_gold_delta=0.2,
        last_tick_at=None,
    ))
    service._get_wallet = lambda user_id: _async_value(SimpleNamespace(solana_pubkey="0xwallet"))
    service._get_social_standing = lambda user_id, wallet_address: _async_value({
        "tier": "Trusted",
        "reputation_bps": 9100,
        "normalized_score": 0.91,
        "daily_manna_multiplier_bps": 14500,
        "governance_weight_bps": 12800,
    })
    service.sync_user_attestations = lambda user_id, wallet_address=None: _async_value([
        SimpleNamespace(
            covenant_id=covenant_id,
            covenant_key="0xabc",
            status="ACTIVE",
            expires_at=None,
        )
    ])

    result = await service.evaluate_action(
        user_id="user-1",
        action="bridge",
        amount=50.0,
        covenant_id=covenant_id,
        destination_chain="Arbitrum",
    )

    assert result["allowed"] is True
    assert result["effective_limit"] > 50.0
    assert result["attested"] is True


async def _async_value(value):
    return value
