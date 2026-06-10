const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WiseGoldCCIPTreasurySender", function () {
  async function deployFixture() {
    const [admin, operator, treasuryReceiver, oracle] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const wgold = await MockToken.deploy("WiseGold", "WGOLD");
    await wgold.waitForDeployment();
    const link = await MockToken.deploy("Link", "LINK");
    await link.waitForDeployment();

    const Router = await ethers.getContractFactory("MockRouterClient");
    const router = await Router.deploy();
    await router.waitForDeployment();

    const MockFeed = await ethers.getContractFactory("MockXAUUSDFeed");
    const feed = await MockFeed.deploy(ethers.parseUnits("3000", 8));
    await feed.waitForDeployment();

    const Token = await ethers.getContractFactory("WiseGoldChainlinkToken");
    const token = await Token.deploy(
      admin.address,
      oracle.address,
      admin.address,
      await feed.getAddress()
    );
    await token.waitForDeployment();

    const Verifier = await ethers.getContractFactory("WiseGoldBackendCovenantVerifier");
    const verifier = await Verifier.deploy(admin.address);
    await verifier.waitForDeployment();

    const Controller = await ethers.getContractFactory("WiseGoldPolicyController");
    const controller = await Controller.deploy(admin.address, await token.getAddress(), await verifier.getAddress());
    await controller.waitForDeployment();

    const controllerRole = await token.POLICY_CONTROLLER_ROLE();
    await token.grantRole(controllerRole, await controller.getAddress());
    await controller.setApprovedDestinationChain(16015286601757825753n, true);
    await verifier.upsertAttestation(
      operator.address,
      ethers.id("founders"),
      true,
      Math.floor(Date.now() / 1000) + 86400,
      "backend-membership"
    );

    const Sender = await ethers.getContractFactory("WiseGoldCCIPTreasurySender");
    const sender = await Sender.deploy(
      admin.address,
      await router.getAddress(),
      await token.getAddress(),
      await link.getAddress(),
      await controller.getAddress()
    );
    await sender.waitForDeployment();

    const operatorRole = await sender.BRIDGE_OPERATOR_ROLE();
    await sender.grantRole(operatorRole, operator.address);

    await sender.configureDestination(16015286601757825753n, treasuryReceiver.address, 300000);
    await token.mintGenesis(operator.address, ethers.parseEther("100"));
    await link.mint(await sender.getAddress(), ethers.parseEther("100"));
    await token.connect(operator).approve(await sender.getAddress(), ethers.parseEther("100"));

    return { sender, token, router, operator, treasuryReceiver, verifier, controller };
  }

  it("quotes fee and sends WGOLD over CCIP", async function () {
    const { sender, token, router, operator } = await deployFixture();
    const selector = 16015286601757825753n;

    expect(await sender.quoteBridgeFee(selector, ethers.parseEther("5"))).to.equal(ethers.parseEther("2"));

    const tx = await sender.connect(operator).bridgeWGold(selector, ethers.ZeroAddress, ethers.parseEther("5"));
    await expect(tx).to.emit(sender, "WGoldBridged");

    expect(await token.balanceOf(await sender.getAddress())).to.equal(ethers.parseEther("4.975"));
    expect(await router.messageCounter()).to.equal(1n);
  });

  it("blocks bridge attempts without an attestation", async function () {
    const { sender, operator, verifier } = await deployFixture();
    const selector = 16015286601757825753n;

    await verifier.upsertAttestation(
      operator.address,
      ethers.id("founders"),
      false,
      Math.floor(Date.now() / 1000) + 86400,
      "backend-membership"
    );

    await expect(
      sender.connect(operator).bridgeWGold(selector, ethers.ZeroAddress, ethers.parseEther("1"))
    ).to.be.reverted;
  });

  it("blocks bridge attempts to destinations that are not approved", async function () {
    const { sender, operator, treasuryReceiver } = await deployFixture();

    await expect(
      sender.connect(operator).bridgeWGold(999n, treasuryReceiver.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});
