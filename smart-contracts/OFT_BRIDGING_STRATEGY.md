# WiseGold Omnichain Fungible Token (OFT) Strategy

To power the Sovereign 3.0 Economy, the WiseGold (WGOLD) token relies on **LayerZero V2's OFT Standard** to enable seamless, burn-and-mint bridging between the Arbitrum Hub and Solana Spoke.

## Architecture

Traditional bridged assets rely on "Lock and Mint" mechanics (e.g., locking ERC-20 tokens in a vault on Arbitrum to issue wrapped tokens on Solana). This creates honey-pots vulnerable to exploits. 

The OFT standard sidesteps this by ensuring the token is native on all chains:
1. **Send Initiation (Arbitrum)**: A user requests to move 1,000 WGOLD to Solana. The Arbitrum OFT contract exactly burns 1,000 WGOLD from their balance.
2. **Verification (LayerZero)**: Decentralized Verifier Networks (DVNs) and Executors confirm the burn event securely on the LayerZero endpoint.
3. **Receive Execution (Solana)**: The Solana OFT program receives the verified message and natively mints exactly 1,000 WGOLD to the user's SPL account.

## Deployment Steps

1. **Deploy Arbitrum Hub (`WiseGold.sol`)**:
   - Deployed inheriting `OFT` from `@layerzerolabs/lz-evm-oapp-v2`.
   - Initialize with the local Arbitrum LayerZero Endpoint address.

2. **Deploy Solana Spoke (SPL Token-2022 + OFT Program)**:
   - Deploy the native SPL Token utilizing Token-2022 extensions to handle the Velocity Tax dynamically on all transfers.
   - Deploy the LayerZero OFT Adapter program on Solana mapped to the SPL Mint.

3. **Peer Wire-Up**:
   - On Arbitrum: Call `setPeer` on the WiseGold contract, passing the Endpoint ID for Solana and the deployed Solana program address.
   - On Solana: Register the Arbitrum contract address as a trusted peer for inbound minting instructions.

## Security Considerations

- **Velocity Tax Evasion**: The Velocity Tax is strictly evaluated *before* cross-chain transfers. A user sending 100 WGOLD across the bridge will pay the dynamic tax (e.g., 0.5%) on Arbitrum, burning 99.5 WGOLD, resulting in exactly 99.5 WGOLD minted on Solana to maintain the 1:1 global supply parity.
- **Manna Pool Isolation**: The Arbitrum Manna Pool address is exempted from the OFT bridging tax to allow the Python backend to freely rebalance Manna between chains if the economy requires localized liquidity.
