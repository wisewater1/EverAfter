import asyncio
import logging
import math
import random
import time
import uuid
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from web3 import Web3
except Exception:  # pragma: no cover - optional until environment installs web3
    Web3 = None

TROY_OUNCE_GRAMS = 31.1034768

_cached_gold_price = {
    "price": 72.00,
    "timestamp": 0.0,
}
CACHE_TTL = 300

_AGGREGATOR_V3_ABI = [
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {"internalType": "int256", "name": "answer", "type": "int256"},
            {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
            {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


class ChainlinkService:
    """
    Chainlink access layer.

    - If RPC/feed addresses are configured, reads XAU/USD from a real Chainlink Data Feed.
    - Otherwise falls back to the existing local simulation for development.
    """

    @staticmethod
    async def get_latest_xau_usd_price() -> float:
        current_time = time.time()
        if current_time - _cached_gold_price["timestamp"] < CACHE_TTL:
            return _cached_gold_price["price"]

        if settings.CHAINLINK_RPC_URL and settings.CHAINLINK_XAU_USD_FEED and Web3 is not None:
            try:
                live_price = await asyncio.to_thread(ChainlinkService._fetch_chainlink_xau_price_per_gram)
                _cached_gold_price["price"] = live_price
                _cached_gold_price["timestamp"] = current_time
                logger.info("Chainlink XAU/USD feed updated from onchain source: $%.2f/gram", live_price)
                return live_price
            except Exception as exc:
                logger.warning("Real Chainlink feed unavailable, falling back to simulator: %s", exc)

        try:
            simulated = await ChainlinkService._fetch_simulated_price(current_time)
            _cached_gold_price["price"] = simulated
            _cached_gold_price["timestamp"] = current_time
            return simulated
        except Exception as exc:
            logger.error("Failed to produce WGOLD gold price: %s", exc)
            return _cached_gold_price["price"]

    @staticmethod
    def _fetch_chainlink_xau_price_per_gram() -> float:
        if Web3 is None:
            raise RuntimeError("web3 is not installed")

        provider = Web3.HTTPProvider(settings.CHAINLINK_RPC_URL, request_kwargs={"timeout": 20})
        web3 = Web3(provider)
        if not web3.is_connected():
            raise RuntimeError("unable to connect to configured Chainlink RPC")

        checksum_address = web3.to_checksum_address(settings.CHAINLINK_XAU_USD_FEED)
        feed = web3.eth.contract(address=checksum_address, abi=_AGGREGATOR_V3_ABI)
        decimals = int(feed.functions.decimals().call())
        _, answer, _, updated_at, _ = feed.functions.latestRoundData().call()
        if int(answer) <= 0:
            raise RuntimeError("Chainlink XAU/USD feed returned a non-positive answer")

        xau_usd_per_ounce = float(answer) / (10 ** decimals)
        xau_usd_per_gram = xau_usd_per_ounce / TROY_OUNCE_GRAMS
        if updated_at <= 0:
            logger.warning("Chainlink XAU/USD feed updatedAt is zero")

        return round(xau_usd_per_gram, 2)

    @staticmethod
    async def _fetch_simulated_price(current_time: float) -> float:
        base_price_per_gram = 90.00
        time_factor = math.sin(current_time / 3600.0) * 1.5
        noise = (current_time % 100) / 100.0 * 0.5

        if random.random() < 0.05:
            logger.warning("Simulated primary oracle stale. Using local fallback profile.")
            time_factor = math.cos(current_time / 3600.0) * 1.5
            noise = (current_time % 50) / 50.0 * 0.4

        return float(f"{base_price_per_gram + time_factor + noise:.2f}")

    @staticmethod
    async def initiate_ccip_transfer(
        user_id: str,
        amount: float,
        destination_chain: str,
        destination_address: str,
    ) -> dict:
        logger.info("Initiating Chainlink-style CCIP transfer for user %s", user_id)

        # The repo does not yet own a live CCIP sender deployment. Keep the transfer
        # semantics explicit instead of pretending that a real router call occurred.
        message_id = f"0x{uuid.uuid4().hex}"
        return {
            "status": "submitted",
            "message_id": message_id,
            "destination_chain": destination_chain,
            "destination_address": destination_address,
            "amount_transferred": amount,
            "estimated_fee_usd": 0.50,
            "timestamp": time.time(),
            "note": (
                "Backend ledger recorded. Configure live CCIP sender contracts before treating this "
                "as an onchain bridge finality event."
            ),
        }
