require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { ethers } = require("ethers");
const { SubscriptionManager } = require("@chainlink/functions-toolkit");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(requireEnv("ARBITRUM_SEPOLIA_RPC_URL"));
  const signer = new ethers.Wallet(requireEnv("WGOLD_DEPLOYER_PRIVATE_KEY"), provider);
  const linkTokenAddress = requireEnv("CHAINLINK_LINK_TOKEN");
  const functionsRouterAddress = requireEnv("CHAINLINK_FUNCTIONS_ROUTER");
  const consumerAddress = process.env.WGOLD_REPUTATION_ORACLE_CONTRACT || undefined;
  const juelsAmount = process.env.CHAINLINK_FUNDING_JUELS || "";

  const manager = new SubscriptionManager({
    signer,
    linkTokenAddress,
    functionsRouterAddress
  });

  await manager.initialize();
  const subscriptionId = await manager.createSubscription({ consumerAddress });
  console.log(`Created Chainlink Functions subscription: ${subscriptionId}`);

  if (juelsAmount) {
    await manager.fundSubscription({
      subscriptionId,
      juelsAmount: BigInt(juelsAmount)
    });
    console.log(`Funded subscription ${subscriptionId} with ${juelsAmount} juels`);
  } else {
    console.log("CHAINLINK_FUNDING_JUELS not set. Subscription was created but not funded.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
