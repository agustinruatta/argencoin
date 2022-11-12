// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/// @custom:security-contact agustinruatta@gmail.com
/// CentralBank has the responsability to mint, burn and has the users' positions.
contract CentralBank is Ownable {
    struct Position {
        uint256 mintedArgcAmount;
        uint256 collateralAmount;
    }

    // addres => token => position
    mapping (address => mapping (string => Position)) private positions;

    mapping (string => address) private collateralContracts;

    constructor(address ownerAddress) {
        _transferOwnership(ownerAddress);
    }

    function getPosition(address userAddress, string memory token) public view returns (Position memory) {
        return positions[userAddress][token];
    }

    function addNewCollateralToken(string memory tokenSymbol, address erc20Contract) public onlyOwner {
        require(collateralContracts[tokenSymbol] == address(0), "Token is already set. Please, call 'editColleteralToken' function.");

        collateralContracts[tokenSymbol] = erc20Contract;
    }

    function getCollateralTokenAddress(string memory tokenSymbol) public view returns (address) {
        require(collateralContracts[tokenSymbol] != address(0), "token is not set as collateral");

        return collateralContracts[tokenSymbol];
    }
}
