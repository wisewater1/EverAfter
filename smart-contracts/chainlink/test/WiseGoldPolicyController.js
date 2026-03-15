const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WiseGoldPolicyController", function () {
  async function deployFixture() {
    const [owner, oracle, treasury, user, peer] = await ethers.getSigners();

    const MockFeed = await ethers.getContractFactory("MockXAUUSDFeed");
    const feed = await MockFeed.deploy(ethers.parseUnits("3000", 8));
    await feed.waitForDeployment();

    const Token = await ethers.getContractFactory("WiseGoldChainlinkToken");
    const token = await Token.deploy(
      owner.address,
      oracle.address,
      treasury.address,
      await feed.getAddress()
    );
    await token.waitForDeployment();

    const Verifier = await ethers.getContractFactory("WiseGoldBackendCovenantVerifier");
    const verifier = await Verifier.deploy(owner.address);
    await verifier.waitForDeployment();

    const Controller = await ethers.getContractFactory("WiseGoldPolicyController");
    const controller = await Controller.deploy(owner.address, await token.getAddress(), await verifier.getAddress());
    await controller.waitForDeployment();

    const policyControllerRole = await token.POLICY_CONTROLLER_ROLE();
    await token.grantRole(policyControllerRole, await controller.getAddress());

    return { token, verifier, controller, owner, oracle, treasury, user, peer };
  }

  it("keeps ordinary transfers open without attestation", async function () {
    const { token, treasury, user, peer } = await deployFixture();

    await token.mintGenesis(user.address, ethers.parseEther("100"));
    await token.connect(user).transfer(peer.address, ethers.parseEther("10"));

    expect(await token.balanceOf(peer.address)).to.equal(ethers.parseEther("9.95"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("0.05"));
  });

  it("requires attestation for policy minting and succeeds once attested", async function () {
    const { token, verifier, controller, user } = await deployFixture();
    const covenantKey = ethers.id("st-joseph-family");
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;

    await expect(
      controller.policyMint(user.address, covenantKey, ethers.parseEther("10"), ethers.id("manna"))
    ).to.be.reverted;

    await verifier.upsertAttestation(user.address, covenantKey, true, expiresAt, "backend-membership");
    await controller.policyMint(user.address, covenantKey, ethers.parseEther("10"), ethers.id("manna"));

    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("10"));
  });

  it("raises withdraw limits for higher-reputation wallets", async function () {
    const { token, verifier, controller, oracle, user } = await deployFixture();
    const covenantKey = ethers.id("st-joseph-family");
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;

    await verifier.upsertAttestation(user.address, covenantKey, true, expiresAt, "backend-membership");

    const lowQuote = await controller.quoteWithdrawPolicy(user.address, covenantKey, 0);
    await token.connect(oracle).syncReputation(user.address, 9500, 123);
    const highQuote = await controller.quoteWithdrawPolicy(user.address, covenantKey, 0);

    expect(highQuote[1]).to.be.gt(lowQuote[1]);
  });

  it("returns a policy deny reason when the request exceeds the effective limit", async function () {
    const { verifier, controller, user } = await deployFixture();
    const covenantKey = ethers.id("founders");
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;

    await verifier.upsertAttestation(user.address, covenantKey, true, expiresAt, "backend-membership");
    const result = await controller.quoteWithdrawPolicy(user.address, covenantKey, ethers.parseEther("1000000"));

    expect(result[0]).to.equal(false);
    expect(result[2]).to.equal(ethers.keccak256(ethers.toUtf8Bytes("LIMIT_EXCEEDED")));
  });
});
