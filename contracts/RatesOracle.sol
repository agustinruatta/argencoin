// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @custom:security-contact agustinruatta@gmail.com
// This is a very draft implementation. Lot of work to do.
contract RatesOracle is Ownable {
    struct RateInfo {
        uint256 rate;
        uint256 blockNumber;
    }

    mapping(string => RateInfo) private rates;

    uint256 mockedRate;

    function setArgencoinRate(string memory tokenSymbol, uint256 rate) public onlyOwner {
        rates[tokenSymbol] = RateInfo(rate, block.number);
    }

    function getArgencoinRate(string memory tokenSymbol) public view returns (uint256) {
        require(rates[tokenSymbol].blockNumber != 0, "No rate available");

        return rates[tokenSymbol].rate;
    }
}
