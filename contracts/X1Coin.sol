// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract X1Coin is ERC20, Ownable, ReentrancyGuard {
    uint256 private constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion Tokens
    uint256 private constant PUBLIC_SALE_ALLOCATION = (TOTAL_SUPPLY * 50) / 100;
    uint256 private constant TEAM_ADVISORS_ALLOCATION = (TOTAL_SUPPLY * 30) / 100;
    uint256 private constant COMMUNITY_DEVELOPMENT_ALLOCATION = (TOTAL_SUPPLY * 20) / 100;
    uint256 public teamUnlockTime;
    address public teamWallet;

    mapping(address => uint256) private _lockedBalances;

    // Staking Variables
    uint256 public constant REWARD_RATE = 10; // 10% annually
    uint256 public constant MIN_STAKE_DURATION = 30 days;
    

    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
    }

    mapping(address => StakeInfo) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);

    constructor(address _teamWallet, address _communityWallet) ERC20("X1Coin", "X1C")  {
        require(_teamWallet != address(0), "Invalid team wallet");
        require(_communityWallet != address(0), "Invalid community wallet");

        teamWallet = _teamWallet;
        teamUnlockTime = block.timestamp + 180 days; // 6 months lock

        _mint(msg.sender, PUBLIC_SALE_ALLOCATION); // Public Sale allocation
        _mint(_communityWallet, COMMUNITY_DEVELOPMENT_ALLOCATION); // Community Development allocation
        _lockedBalances[teamWallet] = TEAM_ADVISORS_ALLOCATION; // Lock Team & Advisors tokens
    }

    function lockedBalances(address account) external view returns (uint256) {
        return _lockedBalances[account];
    }

    function releaseTeamTokens() external {
        require(msg.sender == teamWallet, "Only team wallet can release tokens");
        require(block.timestamp >= teamUnlockTime, "Tokens are still locked");
        require(_lockedBalances[teamWallet] > 0, "No locked tokens left");

        uint256 amount = _lockedBalances[teamWallet];
        _lockedBalances[teamWallet] = 0;
        _mint(teamWallet, amount);
    }

    // Staking Functions
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);

        stakes[msg.sender] = StakeInfo(amount, block.timestamp);
        emit Staked(msg.sender, amount);
    }

    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.amount > 0, "No tokens staked");
        require(block.timestamp >= stakeInfo.startTime + MIN_STAKE_DURATION, "Staking period not completed");

        uint256 reward = calculateReward(stakeInfo.amount, stakeInfo.startTime);
        uint256 totalAmount = stakeInfo.amount + reward;

        delete stakes[msg.sender];
        _transfer(address(this), msg.sender, totalAmount);
        emit Unstaked(msg.sender, stakeInfo.amount, reward);
    }

    function calculateReward(uint256 amount, uint256 startTime) public view returns (uint256) {
        uint256 duration = block.timestamp - startTime;
        return (amount * REWARD_RATE * duration) / (100 * 365 days);
    }
}
