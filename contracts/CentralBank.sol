// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @custom:security-contact agustinruatta@gmail.com
/// CentralBank has the responsability to mint, burn and has the balance of users.
contract CentralBank is Ownable {
    constructor(address ownerAddress) {
        _transferOwnership(ownerAddress);
    }
}
