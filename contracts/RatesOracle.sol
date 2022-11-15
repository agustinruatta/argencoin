// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @custom:security-contact agustinruatta@gmail.com
contract RatesOracle {
    struct Position {
        uint256 mintedArgcAmount;
        uint256 collateralAmount;
    }

    uint256 mockedRate;

    function setMockedRate(uint256 rate) public {
        mockedRate = rate;
    }

    function getArgencoinRate(string memory tokenSymbol) public view returns (uint256) {
        return mockedRate;
    }
}
