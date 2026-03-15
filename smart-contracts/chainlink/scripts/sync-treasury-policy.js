const hre = require("hardhat");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const endpoint = requireEnv("WGOLD_POLICY_ENDPOINT");
  const controllerAddress = process.env.WGOLD_POLICY_CONTROLLER_CONTRACT || requireEnv("WGOLD_POLICY_CONTROLLER");
  const oracleKey = requireEnv("WISEGOLD_ORACLE_API_KEY");

  const response = await fetch(endpoint, {
    headers: {
      "x-wisegold-oracle-key": oracleKey
    }
  });

  if (!response.ok) {
    throw new Error(`Policy endpoint failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const controller = await hre.ethers.getContractAt("WiseGoldPolicyController", controllerAddress);

  const toBps = (value, clamp = 10000) => {
    const scaled = Math.round(Number(value) * 10000);
    return Math.max(0, Math.min(clamp, scaled));
  };

  const taxBps = toBps(data.current_tax_rate || 0);
  const stressBps = toBps((Number(data.stress_level || 0) / 10), 10000);
  const velocityRatio = Number(data.last_tick_velocity || 0) / Math.max(Number(data.daily_manna_pool || 1), 1);
  const velocityBps = Math.max(0, Math.min(15000, Math.round(velocityRatio * 10000)));
  const goldDeltaBps = Math.max(0, Math.min(10000, Math.round(Math.abs(Number(data.last_gold_delta || 0)) * 100)));

  const tx = await controller.syncTreasuryPolicy(taxBps, stressBps, velocityBps, goldDeltaBps);
  const receipt = await tx.wait();

  console.log(JSON.stringify({
    controller: controllerAddress,
    endpoint,
    taxBps,
    stressBps,
    velocityBps,
    goldDeltaBps,
    transactionHash: receipt.hash
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
