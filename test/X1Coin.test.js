const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("X1Coin Token Contract", function () {
  let X1Coin, x1coin, owner, team, community, addr1, addr2;
  const TOTAL_SUPPLY = ethers.parseUnits("1000000000", 18); // 1 Billion
  const PUBLIC_SALE_ALLOCATION = (TOTAL_SUPPLY * 50n) / 100n;
  const TEAM_ADVISORS_ALLOCATION = (TOTAL_SUPPLY * 30n) / 100n;
  const COMMUNITY_DEVELOPMENT_ALLOCATION = (TOTAL_SUPPLY * 20n) / 100n;
  const REWARD_RATE = 10n; // 10% annually
  const MIN_STAKE_DURATION = 30 * 24 * 60 * 60; // 30 days
  const SIX_MONTHS = 180 * 24 * 60 * 60; // 180 days in seconds

  beforeEach(async function () {
    [owner, team, community, addr1, addr2] = await ethers.getSigners();
    X1Coin = await ethers.getContractFactory("X1Coin");
    x1coin = await X1Coin.deploy(team.address, community.address);
    await x1coin.waitForDeployment();
  });

  // ✅ Check token name and symbol
  it("Should have correct name and symbol", async function () {
    expect(await x1coin.name()).to.equal("X1Coin");
    expect(await x1coin.symbol()).to.equal("X1C");
  });

  // ✅ Check token allocation
  it("Should correctly allocate token supply", async function () {
    expect(await x1coin.balanceOf(owner.address)).to.equal(PUBLIC_SALE_ALLOCATION);
    expect(await x1coin.balanceOf(community.address)).to.equal(COMMUNITY_DEVELOPMENT_ALLOCATION);
    expect(await x1coin.balanceOf(team.address)).to.equal(0); // Locked tokens
    expect(await x1coin.lockedBalances(team.address)).to.equal(TEAM_ADVISORS_ALLOCATION);
  });

  // ✅ Ensure transfers work
  it("Should allow transfers between accounts", async function () {
    await x1coin.transfer(addr1.address, 100);
    expect(await x1coin.balanceOf(addr1.address)).to.equal(100);
  });

  // ✅ Test `approve()` and `transferFrom()`
  it("Should approve and allow transferFrom", async function () {
    await x1coin.approve(addr1.address, 200);
    await x1coin.connect(addr1).transferFrom(owner.address, addr2.address, 200);
    expect(await x1coin.balanceOf(addr2.address)).to.equal(200);
  });

  // ✅ Prevent team from withdrawing tokens before 6 months
  it("Should prevent team from withdrawing tokens before 6 months", async function () {
    await expect(x1coin.connect(team).releaseTeamTokens()).to.be.revertedWith("Tokens are still locked");
  });

  // ✅ Allow team to release tokens after 6 months
  it("Should allow team to release tokens after 6 months", async function () {
    await ethers.provider.send("evm_increaseTime", [SIX_MONTHS]);
    await ethers.provider.send("evm_mine");

    await expect(x1coin.connect(team).releaseTeamTokens())
      .to.emit(x1coin, "Transfer")
      .withArgs(ethers.ZeroAddress, team.address, TEAM_ADVISORS_ALLOCATION);

    expect(await x1coin.balanceOf(team.address)).to.equal(TEAM_ADVISORS_ALLOCATION);
  });

  // ✅ Revert if a non-team member tries to release team tokens
  it("Should revert if non-team member tries to release team tokens", async function () {
    await ethers.provider.send("evm_increaseTime", [SIX_MONTHS]);
    await ethers.provider.send("evm_mine");

    await expect(x1coin.connect(owner).releaseTeamTokens()).to.be.revertedWith("Only team wallet can release tokens");
  });

  // ✅ Ensure team cannot re-release tokens after withdrawal
  it("Should not allow re-release of team tokens after withdrawal", async function () {
    await ethers.provider.send("evm_increaseTime", [SIX_MONTHS]);
    await ethers.provider.send("evm_mine");

    await x1coin.connect(team).releaseTeamTokens();
    await expect(x1coin.connect(team).releaseTeamTokens()).to.be.revertedWith("No locked tokens left");
  });

  // ✅ Staking Tests
  it("Should allow staking and store correct staking data", async function () {
    await x1coin.transfer(addr1.address, ethers.parseUnits("1000", 18));
    await x1coin.connect(addr1).stake(ethers.parseUnits("500", 18));

    const stakeInfo = await x1coin.stakes(addr1.address);
    expect(stakeInfo.amount).to.equal(ethers.parseUnits("500", 18));
    expect(stakeInfo.startTime).to.be.gt(0);
  });

  // ✅ Ensure staking fails if user has insufficient balance
  it("Should revert staking if balance is insufficient", async function () {
    await expect(x1coin.connect(addr1).stake(ethers.parseUnits("500", 18))).to.be.revertedWith("Insufficient balance");
  });

  // ✅ Prevent unstaking before 30 days
  it("Should not allow unstaking before minimum duration", async function () {
    await x1coin.transfer(addr1.address, ethers.parseUnits("1000", 18));
    await x1coin.connect(addr1).stake(ethers.parseUnits("500", 18));

    await expect(x1coin.connect(addr1).unstake()).to.be.revertedWith("Staking period not completed");
  });

  // ✅ Unstake tokens correctly after minimum duration
  it("Should allow unstaking after minimum duration and distribute rewards", async function () {
    await x1coin.transfer(addr1.address, ethers.parseUnits("1000", 18));
    await x1coin.connect(addr1).stake(ethers.parseUnits("500", 18));

    await ethers.provider.send("evm_increaseTime", [MIN_STAKE_DURATION]);
    await ethers.provider.send("evm_mine");

    const initialBalance = await x1coin.balanceOf(addr1.address);
    await expect(x1coin.connect(addr1).unstake()).to.emit(x1coin, "Unstaked");

    const finalBalance = await x1coin.balanceOf(addr1.address);
    expect(finalBalance).to.be.gt(initialBalance);
  });

  // ✅ Reward calculation test
  it("Should calculate rewards correctly", async function () {
    const stakeAmount = ethers.parseUnits("1000", 18);
    await x1coin.transfer(addr1.address, stakeAmount);
    await x1coin.connect(addr1).stake(stakeAmount);

    await ethers.provider.send("evm_increaseTime", [MIN_STAKE_DURATION]);
    await ethers.provider.send("evm_mine");

    const expectedReward = (stakeAmount * REWARD_RATE * BigInt(MIN_STAKE_DURATION)) / (100n * 365n * 24n * 60n * 60n);
    expect(await x1coin.calculateReward(stakeAmount, (await x1coin.stakes(addr1.address)).startTime)).to.be.closeTo(expectedReward, 1n);
  });

  // ✅ Transfer and Approval Events
  it("Should emit Transfer and Approval events", async function () {
    await expect(x1coin.transfer(addr1.address, 50))
      .to.emit(x1coin, "Transfer")
      .withArgs(owner.address, addr1.address, 50);

    await expect(x1coin.approve(addr1.address, 100))
      .to.emit(x1coin, "Approval")
      .withArgs(owner.address, addr1.address, 100);
  });
});
