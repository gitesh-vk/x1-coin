const { ethers } = require("hardhat");

async function main() {
  // Get signers
  const [deployer, team, community] = await ethers.getSigners();

  console.log("Deploying X1Coin with the account:", deployer.address);

  // Deploy contract
  const X1Coin = await ethers.getContractFactory("X1Coin");
  const x1coin = await X1Coin.deploy(team.address, community.address);
  await x1coin.waitForDeployment();

  console.log("X1Coin deployed to:", await x1coin.getAddress());
  console.log("Team Wallet:", team.address);
  console.log("Community Wallet:", community.address);

  // Verify allocations
  const ownerBalance = await x1coin.balanceOf(deployer.address);
  const communityBalance = await x1coin.balanceOf(community.address);
  const lockedTeamBalance = await x1coin.lockedBalances(team.address);

  console.log("Owner Balance:", ethers.formatUnits(ownerBalance, 18), "X1C");
  console.log("Community Balance:", ethers.formatUnits(communityBalance, 18), "X1C");
  console.log("Locked Team Balance:", ethers.formatUnits(lockedTeamBalance, 18), "X1C");
}

// Run script and handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
