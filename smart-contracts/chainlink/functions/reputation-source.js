const oracleEndpoint = args[0].replace(/\/$/, "");
const userId = args[1];

const headers = {};
if (secrets.oracleKey) {
  headers["x-wisegold-oracle-key"] = secrets.oracleKey;
}

const response = await Functions.makeHttpRequest({
  url: `${oracleEndpoint}/${encodeURIComponent(userId)}`,
  method: "GET",
  headers
});

if (response.error) {
  throw Error(`WiseGold oracle request failed: ${response.error}`);
}

const score = Number(response.data.reputation_bps);
if (!Number.isFinite(score)) {
  throw Error("WiseGold oracle did not return a numeric reputation_bps value");
}

const boundedScore = Math.max(0, Math.min(10000, Math.round(score)));
return Functions.encodeUint256(boundedScore);
