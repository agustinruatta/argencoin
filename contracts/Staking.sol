// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Argencoin.sol";

using SafeERC20 for IERC20;
using SafeERC20 for Argencoin;

/// @custom:security-contact agustinruatta@gmail.com
contract Staking is Ownable {
    Argencoin public argencoinToken;

    IERC20 public rewardToken;

    // Timestamp when rewards finish
    uint public finishAt;

    // Reward finish time
    uint public updatedAt;

    // Reward to be paid out per second
    uint public rewardRate;

    // Sum of (reward rate * dt * 1e18 / total supply)
    uint public rewardPerTokenStored;

    // User address => rewardPerTokenStored
    mapping(address => uint) public userRewardPerTokenPaid;

    // User address => rewards to be claimed
    mapping(address => uint) public rewards;

    // Total staked
    uint public totalSupply;

    // User address => staked amount
    mapping(address => uint) public balanceOf;

    constructor(address stakingOwner, address argencoinAddress, address rewardTokenAddress) {
        argencoinToken = Argencoin(argencoinAddress);
        rewardToken = IERC20(rewardTokenAddress);

        _transferOwnership(stakingOwner);
    }

    function editArgencoinToken(address argencoinContractAddress) external onlyOwner {
        argencoinToken = Argencoin(argencoinContractAddress);
    }

    function editRewardToken(address erc20ContractAddress) external onlyOwner {
        rewardToken = IERC20(erc20ContractAddress);
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = _getRewardAmountPerToken();
        updatedAt = _oldestApplicableRewardTime();

        if (_account != address(0)) {
            rewards[_account] = _earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }

        _;
    }

    function stake(uint _amount) external updateReward(msg.sender) {
        require(_amount > 0, "Amount to stake must be greater than 0");

        argencoinToken.safeTransferFrom(msg.sender, address(this), _amount);

        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
    }

    function withdraw(uint _amount) external updateReward(msg.sender) {
        require(_amount > 0, "Amount to withdraw must be greater than 0");

        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;

        argencoinToken.safeTransfer(msg.sender, _amount);
    }

    function collectReward() external updateReward(msg.sender) {
        uint reward = rewards[msg.sender];

        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
        }
    }

    /**
     * @param amount Amount of reward token to give in duration.
     * @param duration Duration (in seconds) that rewards will be paid out.
     */
    function setNextReward(uint256 amount, uint256 duration)
        external
        onlyOwner
        updateReward(address(0))
    {
        //console.log("*** Set next reward");
        require(finishAt < block.timestamp, "Previous reward has not finished yet");
        require(amount <= rewardToken.balanceOf(address(this)), "Not enough funds in staking to give that amount of reward");

        rewardRate = amount / duration;

        require(rewardRate > 0, "Reward rate must be greater than 0");

        finishAt = block.timestamp + duration;
        updatedAt = block.timestamp;
    }

    /**
     * Returns how many rewards give per second.
     */
    function _getRewardAmountPerToken() private view returns (uint) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardRate * (_oldestApplicableRewardTime() - updatedAt) * 1e18) / totalSupply;
    }

    function _earned(address _account) private view returns (uint) {
        return ((balanceOf[_account] * (_getRewardAmountPerToken() - userRewardPerTokenPaid[_account])) / 1e18) + rewards[_account];
    }

    function _oldestApplicableRewardTime() private view returns (uint) {
        return _min(finishAt, block.timestamp);
    }

    function _min(uint x, uint y) private pure returns (uint) {
        return x <= y ? x : y;
    }
}
