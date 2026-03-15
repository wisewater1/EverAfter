const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WiseGoldChainlinkToken", function () {
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

    const distributorRole = await token.REWARD_DISTRIBUTOR_ROLE();
    await token.grantRole(distributorRole, owner.address);

    return { token, feed, owner, oracle, treasury, user, peer };
  }

  it("issues larger rewards to higher-reputation wallets", async function () {
    const { token, oracle, user } = await deployFixture();

    await token.connect(oracle).syncReputation(user.address, 9000, 123);
    await token.issueSocialReward(user.address, ethers.parseEther("100"), ethers.id("community"));

    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("142"));
  });

  it("routes transfer tax to the manna treasury", async function () {
    const { token, owner, treasury, user, peer } = await deployFixture();

    await token.mintGenesis(user.address, ethers.parseEther("100"));
    await token.connect(user).transfer(peer.address, ethers.parseEther("10"));

    expect(await token.balanceOf(peer.address)).to.equal(ethers.parseEther("9.95"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("0.05"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("90"));
  });
});
