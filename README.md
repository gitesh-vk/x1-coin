# X1Coin Staking and ERC-20 Token
# Overview
X1Coin is an ERC-20 token with staking functionality that allows users to earn rewards over time. 
The contract includes secure staking, token vesting, and reward distribution mechanisms.

# Features
# ERC-20 Token Functionality
•	Transfers, approvals, and balance updates.
•	Events for Transfer and Approval.
•	Fixed total supply of 1 billion tokens.

# Token Distribution Logic
•	Public Sale: 50%.
•	Team & Advisors: 30% (locked for 6 months).
•	Community Development: 20%.

# Staking and Rewards
•	Stake X1Coins to earn rewards.
•	Fixed reward rate: 10% annually.
•	Unstake tokens after a minimum period of 30 days.
•	Secure implementation using ReentrancyGuard.

# Installation
npm install
Deployment
1.	Compile the contract:
npx hardhat compile
2.	Deploy the contract:
npx hardhat run scripts/deploy.js --network hardhat

# Running Tests
To run the test suite:
npx hardhat test
Security Measures
•	ReentrancyGuard prevents reentrancy attacks.
•	State variables properly managed to ensure secure reward distribution.
•	Token vesting logic prevents premature withdrawal of locked funds.

# Test Script and Deply Script Added

# Note: If you want to test the code in REMIX IDE, update the following line in the smart contract, as Remix IDE may be using an older version of OpenZeppelin:
constructor(address _teamWallet, address _communityWallet) ERC20("X1Coin", "X1C") Ownable(msg.sender) {
