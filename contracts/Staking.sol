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
    Argencoin public immutable argencoinToken;
    mapping(string => IERC20) public rewardTokenContracts;

    constructor(address stakingOwner, address argencoinAddress) {
        argencoinToken = Argencoin(argencoinAddress);

        _transferOwnership(stakingOwner);
    }

    function addRewardToken(string memory tokenSymbol, address erc20ContractAddress) external onlyOwner {
        rewardTokenContracts[tokenSymbol] = IERC20(erc20ContractAddress);
    }
}
