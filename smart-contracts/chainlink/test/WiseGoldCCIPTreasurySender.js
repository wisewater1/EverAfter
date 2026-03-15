const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WiseGoldCCIPTreasurySender", function () {
  async function deployFixture() {
    const [admin, operator, treasuryReceiver] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const wgold = await MockToken.deploy("WiseGold", "WGOLD");
    await wgold.waitForDeployment();
    const link = await MockToken.deploy("Link", "LINK");
    await link.waitForDeployment();

    const Router = await ethers.getContractFactory("MockRouterClient");
    const router = await Router.deploy();
    await router.waitForDeployment();

    const Sender = await ethers.getContractFactory("WiseGoldCCIPTreasurySender");
    const sender = await Sender.deploy(
      admin.address,
      await router.getAddress(),
      await wgold.getAddress(),
      await link.getAddress()
    );
    await sender.waitForDeployment();

    const operatorRole = await sender.BRIDGE_OPERATOR_ROLE();
    await sender.grantRole(operatorRole, operator.address);

    await sender.configureDestination(16015286601757825753n, treasuryReceiver.address, 300000);
    await wgold.mint(operator.address, ethers.parseEther("100"));
    await link.mint(await sender.getAddress(), ethers.parseEther("100"));
    await wgold.connect(operator).approve(await sender.getAddress(), ethers.parseEther("100"));

    return { sender, wgold, router, operator, treasuryReceiver };
  }

  it("quotes fee and sends WGOLD over CCIP", async function () {
    const { sender, wgold, router, operator } = await deployFixture();
    const selector = 16015286601757825753n;

    expect(await sender.quoteBridgeFee(selector, ethers.parseEther("5"))).to.equal(ethers.parseEther("2"));

    const tx = await sender.connect(operator).bridgeWGold(selector, ethers.ZeroAddress, ethers.parseEther("5"));
    await expect(tx).to.emit(sender, "WGoldBridged");

    expect(await wgold.balanceOf(await sender.getAddress())).to.equal(ethers.parseEther("5"));
    expect(await router.messageCounter()).to.equal(1n);
  });
});
