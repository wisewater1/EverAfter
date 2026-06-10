# WiseGold Chainlink Architecture

This folder contains the Chainlink-native WiseGold token path:

- `WiseGoldChainlinkToken.sol`
  - ERC-20 WGOLD token
  - transfer tax routed to a manna treasury
  - reputation-synced emission multipliers
  - live Chainlink XAU/USD feed reference
- `WiseGoldReputationOracle.sol`
  - Chainlink Functions consumer
  - Chainlink Automation-compatible refresh loop
  - requests a social standing score from the EverAfter backend
- `WiseGoldCCIPTreasurySender.sol`
  - Chainlink CCIP sender app for WGOLD treasury transfers
  - prepares real CCIP token messages instead of using backend-only ledger simulation
- `functions/reputation-source.js`
  - Chainlink Functions source that calls the backend oracle endpoint and returns `reputation_bps`

## Backend requirement

The backend must expose this endpoint:

`GET /api/v1/finance/wisegold/oracle/reputation/{user_id}`

Required header:

- `x-wisegold-oracle-key: <WISEGOLD_ORACLE_API_KEY>`

The current backend implementation already supports this route.

## Environment

Copy `smart-contracts/.env.example` and set:

- `WGOLD_DEPLOYER_PRIVATE_KEY`
- `ARBITRUM_SEPOLIA_RPC_URL`
- `CHAINLINK_FUNCTIONS_ROUTER`
- `CHAINLINK_DON_ID`
- `CHAINLINK_SUBSCRIPTION_ID`
- `CHAINLINK_XAU_USD_FEED`
- `CHAINLINK_LINK_TOKEN`
- `WGOLD_OWNER`
- `WGOLD_MANNA_TREASURY`
- `WGOLD_REPUTATION_ENDPOINT`
- `CHAINLINK_GATEWAY_URLS`
- `CHAINLINK_SECRETS_SLOT_ID`
- `CHAINLINK_SECRETS_EXPIRATION_MINUTES`

`WGOLD_REPUTATION_ENDPOINT` should be the full backend path prefix, for example:

`https://api.everafterai.net/api/v1/finance/wisegold/oracle/reputation`

## Commands

Install:

```bash
npm install
```

Compile:

```bash
npm run compile
```

Test:

```bash
npm test
```

Deploy locally:

```bash
npm run deploy:local
```

Deploy to Arbitrum Sepolia:

```bash
npx hardhat run chainlink/scripts/deploy.js --network arbitrumSepolia
```

Create a Functions subscription:

```bash
npm run functions:create-subscription
```

Encrypt and optionally upload oracle secrets:

```bash
npm run functions:build-secrets
```

## Important limits

- This repo scaffold does not automatically create or fund a Chainlink Functions subscription.
- The included scripts can create a subscription and upload secrets, but they still require a funded deployer wallet, LINK, supported gateway URLs, and live Chainlink network configuration.
- Secrets for the backend oracle key must be uploaded to Chainlink Functions and referenced by the oracle contract.
- The backend reputation score is only as good as the social graph data quality. Bad or sparse interaction data produces neutral scores.
- No production deployment should be treated as final without contract review, role hardening, and an economic attack review.
