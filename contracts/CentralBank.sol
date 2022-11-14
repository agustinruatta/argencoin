// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;

/// @custom:security-contact agustinruatta@gmail.com
/// CentralBank has the responsability to mint, burn and has the users' positions.
contract CentralBank is Ownable {
    struct Position {
        uint256 mintedArgcAmount;
        uint256 collateralAmount;
    }

    // addres => token => position
    mapping (address => mapping (string => Position)) private positions;

    mapping (string => IERC20) private collateralContracts;

    IERC20 private argencoinAddress;

    constructor(address ownerAddress, address _argencoinAddress) {
        _transferOwnership(ownerAddress);

        argencoinAddress = IERC20(_argencoinAddress);
    }

    /**
     * @param collateralBasicPoints This percentage indicates how much an user has to deposit in order mint some money. For example, if this param is 15000 (150%)
     *  and user want to mint 200 ARGC, they have to deposit as least 300 ARGC as collateral.
     * @param liquidationBasicPoints This percentage indicates what is the threshold in which a position can be liquidated. For example, if collateralBasicPoints
     *  is 20000 (200%), liquidationBasicPoints is 12500(125%) and stable/ARGC is $400, it means that it can be liquidated when stable/ARGC is less than $250.
     */
    function setCollateralPercentages(uint32 collateralBasicPoints, uint32 liquidationBasicPoints) public onlyOwner {
        require(collateralBasicPoints > liquidationBasicPoints, "Collateral percentage must be greater than liquidation percentage");
        require(collateralBasicPoints <= 100 || liquidationBasicPoints <= 100, "Collateral and liquidation percentages must be greater 100% (10000 basic points)");
    }

    function getPosition(address userAddress, string memory token) public view returns (Position memory) {
        return positions[userAddress][token];
    }

    function addNewCollateralToken(string memory tokenSymbol, address erc20Contract) public onlyOwner {
        require(address(collateralContracts[tokenSymbol]) == address(0), "Token is already set. Please, call 'editColleteralToken' function.");

        collateralContracts[tokenSymbol] = IERC20(erc20Contract);
    }

    function editCollateralToken(string memory tokenSymbol, address erc20Contract) public onlyOwner {
        require(address(collateralContracts[tokenSymbol]) != address(0), "Token is not set yet. Please, call 'addNewColleteralToken' function.");

        collateralContracts[tokenSymbol] = IERC20(erc20Contract);
    }

    function getCollateralTokenAddress(string memory tokenSymbol) public view returns (IERC20) {
        require(address(collateralContracts[tokenSymbol]) != address(0), "Unkwnown collateral token.");

        return collateralContracts[tokenSymbol];
    }

    function mintArgencoin(uint256 argcAmount, string memory tokenSymbol, uint256 collateralAmount) public {
        IERC20 collateralContract = getCollateralTokenAddress(tokenSymbol);
    }
}
