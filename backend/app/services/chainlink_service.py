import httpx
import time
import logging

logger = logging.getLogger(__name__)

# Cache the gold price to avoid rate limiting or spamming the RPC
_cached_gold_price = {
    "price": 72.00,  # Fallback/Initial mock price if RPC fails
    "timestamp": 0
}
CACHE_TTL = 300  # 5 minutes

class ChainlinkService:
    """
    A service that interacts with Chainlink Decentralized Oracle Networks (DONs).
    Currently supports fetching Data Feeds (e.g. XAU/USD) and simulating CCIP transfers.
    """
    
    @staticmethod
    async def get_latest_xau_usd_price() -> float:
        """
        Fetches the latest XAU/USD price.
        In a production environment, this would use web3.py to read directly from 
        the Chainlink AggregatorV3Interface smart contract.
        For this prototype, we simulate connecting to a price oracle via an API
        or returning a dynamically shifting mock price around a real-world peg.
        """
        current_time = time.time()
        
        # Return cached price if within TTL
        if current_time - _cached_gold_price["timestamp"] < CACHE_TTL:
            return _cached_gold_price["price"]

        try:
            # Note: A real EVM implementation would look like:
            # contract = web3.eth.contract(address="XAU_USD_FEED_ADDRESS", abi=aggregator_v3_interface_abi)
            # latest_data = contract.functions.latestRoundData().call()
            # price = latest_data[1] / (10 ** contract.functions.decimals().call())
            
            # Since we are not running a local Ethereum node to query the Chainlink contract,
            # we simulate an API call that an oracle network might perform,
            # or proxy through a public API for gold prices if available.
            # 
            # For this prototype demonstration, we'll apply a small deterministic jitter 
            # based on the hour to simulate market movement around $2,800/oz (~$90/gram).
            
            import math
            base_price_per_gram = 90.00 # Approximate current real-world gold price
            
            # Simulated market fluctuation based on current hour/minute
            time_factor = math.sin(current_time / 3600.0) * 1.5 
            noise = (current_time % 100) / 100.0 * 0.5
            
            live_price = base_price_per_gram + time_factor + noise
            
            _cached_gold_price["price"] = round(live_price, 2)
            _cached_gold_price["timestamp"] = current_time
            
            logger.info(f"Chainlink Price Feed updated. New XAU/USD: ${_cached_gold_price['price']}/gram")
            
            return _cached_gold_price["price"]

        except Exception as e:
            logger.error(f"Failed to fetch Chainlink data feed: {e}")
            return _cached_gold_price["price"] # Fallback to last known price
            
    
    @staticmethod
    async def initiate_ccip_transfer(
        user_id: str, 
        amount: float, 
        destination_chain: str, 
        destination_address: str
    ) -> dict:
        """
        Simulates initiating a Cross-Chain Interoperability Protocol (CCIP) message
        to bridge WGOLD to another network.
        """
        logger.info(f"Initiating Chainlink CCIP Transfer for User {user_id}")
        logger.info(f"Amount: {amount} WGOLD -> {destination_chain} ({destination_address})")
        
        # In a real implementation, we would construct a CCIP message and send it
        # to the local network's CCIP Router contract using web3.py.
        # This requires paying CCIP fees in LINK or native gas.
        
        import uuid
        message_id = f"0x{uuid.uuid4().hex}"
        
        # Calculate mock CCIP fee (e.g. $0.50 equivalent)
        fee_estimate_usd = 0.50
        
        return {
            "status": "success",
            "message_id": message_id,
            "destination_chain": destination_chain,
            "amount_transferred": amount,
            "estimated_fee_usd": fee_estimate_usd,
            "timestamp": time.time(),
            "note": "CCIP message submitted to router. Waiting for finality."
        }
