require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { ethers } = require("ethers");
const { SecretsManager } = require("@chainlink/functions-toolkit");

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
  const functionsRouterAddress = requireEnv("CHAINLINK_FUNCTIONS_ROUTER");
  const donId = requireEnv("CHAINLINK_DON_ID");
  const oracleKey = requireEnv("WISEGOLD_ORACLE_API_KEY");

  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress,
    donId
  });

  await secretsManager.initialize();
  const encrypted = await secretsManager.encryptSecrets({ oracleKey });
  console.log("Encrypted secrets generated.");
  console.log(JSON.stringify(encrypted, null, 2));

  const gatewayUrls = (process.env.CHAINLINK_GATEWAY_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!gatewayUrls.length) {
    console.log("CHAINLINK_GATEWAY_URLS not set. Skipping DON upload.");
    return;
  }

  const slotId = Number(process.env.CHAINLINK_SECRETS_SLOT_ID || "0");
  const minutesUntilExpiration = Number(process.env.CHAINLINK_SECRETS_EXPIRATION_MINUTES || "15");

  const uploaded = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encrypted.encryptedSecrets,
    gatewayUrls,
    slotId,
    minutesUntilExpiration
  });

  console.log("DON-hosted secrets upload result:");
  console.log(JSON.stringify(uploaded, null, 2));
  console.log(
    "Encrypted secrets reference:",
    secretsManager.buildDONHostedEncryptedSecretsReference({
      slotId,
      version: uploaded.version
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
