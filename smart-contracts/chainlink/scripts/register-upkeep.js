const hre = require("hardhat");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const registrarAddress = requireEnv("CHAINLINK_AUTOMATION_REGISTRAR");
  const linkTokenAddress = requireEnv("CHAINLINK_LINK_TOKEN");
  const upkeepContract = process.env.WGOLD_REPUTATION_ORACLE_CONTRACT || requireEnv("WGOLD_REPUTATION_ORACLE");
  const gasLimit = Number(process.env.CHAINLINK_UPKEEP_GAS_LIMIT || "500000");
  const amount = BigInt(process.env.CHAINLINK_UPKEEP_LINK_FUNDING || hre.ethers.parseEther("5").toString());
  const adminAddress = process.env.WGOLD_OWNER || deployer.address;
  const name = process.env.CHAINLINK_UPKEEP_NAME || "WiseGold Reputation Oracle";

  const linkToken = await hre.ethers.getContractAt(
    [
      "function balanceOf(address account) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ],
    linkTokenAddress
  );

  const registrar = await hre.ethers.getContractAt(
    [
      "function registerUpkeep((string name, bytes encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig, uint96 amount)) external returns (uint256)"
    ],
    registrarAddress
  );

  const balance = await linkToken.balanceOf(deployer.address);
  if (balance < amount) {
    throw new Error(`Insufficient LINK balance. Required ${amount.toString()}, found ${balance.toString()}`);
  }

  await (await linkToken.approve(registrarAddress, amount)).wait();

  const tx = await registrar.registerUpkeep({
    name,
    encryptedEmail: "0x",
    upkeepContract,
    gasLimit,
    adminAddress,
    triggerType: 0,
    checkData: "0x",
    triggerConfig: "0x",
    offchainConfig: "0x",
    amount
  });

  const receipt = await tx.wait();
  console.log(JSON.stringify({
    network: hre.network.name,
    deployer: deployer.address,
    registrar: registrarAddress,
    upkeepContract,
    gasLimit,
    amount: amount.toString(),
    transactionHash: receipt.hash
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
