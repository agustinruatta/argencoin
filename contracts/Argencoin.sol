// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";

/// @custom:security-contact agustinruatta@gmail.com
contract Argencoin is ERC20, ERC20Burnable, AccessControl, ERC20FlashMint {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address minterAddress) ERC20("Argencoin", "ARGC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, minterAddress);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
