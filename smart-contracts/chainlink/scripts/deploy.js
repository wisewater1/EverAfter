const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toBytes32(value) {
  if (value.startsWith("0x")) {
    return value;
  }
  return hre.ethers.encodeBytes32String(value);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const owner = process.env.WGOLD_OWNER || deployer.address;
  const treasury = process.env.WGOLD_MANNA_TREASURY || deployer.address;
  const functionsRouter = requireEnv("CHAINLINK_FUNCTIONS_ROUTER");
  const ccipRouter = process.env.CHAINLINK_CCIP_ROUTER || functionsRouter;
  const donId = toBytes32(requireEnv("CHAINLINK_DON_ID"));
  const subscriptionId = BigInt(requireEnv("CHAINLINK_SUBSCRIPTION_ID"));
  const goldFeed = requireEnv("CHAINLINK_XAU_USD_FEED");
  const linkToken = requireEnv("CHAINLINK_LINK_TOKEN");
  const reputationEndpoint = requireEnv("WGOLD_REPUTATION_ENDPOINT");

  const sourcePath = path.join(__dirname, "..", "functions", "reputation-source.js");
  const requestSource = fs.readFileSync(sourcePath, "utf8");

  const Token = await hre.ethers.getContractFactory("WiseGoldChainlinkToken");
  const token = await Token.deploy(deployer.address, deployer.address, treasury, goldFeed);
  await token.waitForDeployment();

  const Verifier = await hre.ethers.getContractFactory("WiseGoldBackendCovenantVerifier");
  const verifier = await Verifier.deploy(deployer.address);
  await verifier.waitForDeployment();

  const Controller = await hre.ethers.getContractFactory("WiseGoldPolicyController");
  const controller = await Controller.deploy(deployer.address, await token.getAddress(), await verifier.getAddress());
  await controller.waitForDeployment();

  const Oracle = await hre.ethers.getContractFactory("WiseGoldReputationOracle");
  const oracle = await Oracle.deploy(
    functionsRouter,
    await token.getAddress(),
    donId,
    subscriptionId,
    reputationEndpoint,
    requestSource,
    owner
  );
  await oracle.waitForDeployment();

  const TreasurySender = await hre.ethers.getContractFactory("WiseGoldCCIPTreasurySender");
  const treasurySender = await TreasurySender.deploy(
    deployer.address,
    ccipRouter,
    await token.getAddress(),
    linkToken,
    await controller.getAddress()
  );
  await treasurySender.waitForDeployment();

  const oracleRole = await token.ORACLE_ROLE();
  await (await token.grantRole(oracleRole, await oracle.getAddress())).wait();
  const controllerRole = await token.POLICY_CONTROLLER_ROLE();
  await (await token.grantRole(controllerRole, await controller.getAddress())).wait();

  const mintOperatorRole = await controller.MINT_OPERATOR_ROLE();
  await (await controller.grantRole(mintOperatorRole, owner)).wait();

  const policyAdminRole = await controller.POLICY_ADMIN_ROLE();
  await (await controller.grantRole(policyAdminRole, owner)).wait();

  const oracleSyncRole = await controller.ORACLE_SYNC_ROLE();
  await (await controller.grantRole(oracleSyncRole, owner)).wait();

  if (owner !== deployer.address) {
    const defaultAdminRole = await token.DEFAULT_ADMIN_ROLE();
    const rewardDistributorRole = await token.REWARD_DISTRIBUTOR_ROLE();
    const policyRole = await token.POLICY_ROLE();

    await (await token.grantRole(defaultAdminRole, owner)).wait();
    await (await token.grantRole(rewardDistributorRole, owner)).wait();
    await (await token.grantRole(policyRole, owner)).wait();
    await (await token.transferOwnership(owner)).wait();

    const verifierAdminRole = await verifier.DEFAULT_ADMIN_ROLE();
    const verifierAttestationRole = await verifier.ATTESTATION_ADMIN_ROLE();
    await (await verifier.grantRole(verifierAdminRole, owner)).wait();
    await (await verifier.grantRole(verifierAttestationRole, owner)).wait();

    const senderAdminRole = await treasurySender.DEFAULT_ADMIN_ROLE();
    const senderConfigRole = await treasurySender.CONFIG_ROLE();
    const senderOperatorRole = await treasurySender.BRIDGE_OPERATOR_ROLE();
    await (await treasurySender.grantRole(senderAdminRole, owner)).wait();
    await (await treasurySender.grantRole(senderConfigRole, owner)).wait();
    await (await treasurySender.grantRole(senderOperatorRole, owner)).wait();
  }

  console.log(JSON.stringify({
    network: hre.network.name,
    deployer: deployer.address,
    token: await token.getAddress(),
    covenantVerifier: await verifier.getAddress(),
    policyController: await controller.getAddress(),
    oracle: await oracle.getAddress(),
    ccipTreasurySender: await treasurySender.getAddress(),
    treasury,
    linkToken,
    goldFeed,
    reputationEndpoint,
    functionsRouter,
    ccipRouter,
    automation: {
      registrar: process.env.CHAINLINK_AUTOMATION_REGISTRAR || null,
      registry: process.env.CHAINLINK_AUTOMATION_REGISTRY || null
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
