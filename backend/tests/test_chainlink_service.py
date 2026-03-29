import pytest

from app.services.chainlink_service import ChainlinkService, _cached_gold_price


@pytest.mark.asyncio
async def test_chainlink_service_raises_when_no_live_feed_or_cache(monkeypatch):
    _cached_gold_price["price"] = None
    _cached_gold_price["timestamp"] = 0.0

    monkeypatch.setattr("app.services.chainlink_service.settings.CHAINLINK_RPC_URL", "")
    monkeypatch.setattr("app.services.chainlink_service.settings.CHAINLINK_XAU_USD_FEED", "")

    with pytest.raises(RuntimeError, match="not configured"):
        await ChainlinkService.get_latest_xau_usd_price()
