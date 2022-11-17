// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RatesOracle.sol";
import "./Argencoin.sol";

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

    uint32 private collateralBasicPoints;

    uint32 private liquidationBasicPoints;

    Argencoin private argencoinContract;
    RatesOracle private ratesContract;

    uint16 private constant ONE_HUNDRED_BASIC_POINTS = 10000;
    uint64 private constant ONE_COLLATERAL_TOKEN_UNIT = 10**18;


    constructor(address ownerAddress, address _argencoinAddress, address _ratesOracleAddress) {
        _transferOwnership(ownerAddress);

        argencoinContract = Argencoin(_argencoinAddress);
        ratesContract = RatesOracle(_ratesOracleAddress);
    }

    /**
     * @param _collateralBasicPoints This percentage indicates how much an user has to deposit in order mint some money. For example, if this param is 15000 (150%)
     *  and user want to mint 200 ARGC, they have to deposit as least 300 ARGC as collateral.
     * @param _liquidationBasicPoints This percentage indicates what is the threshold in which a position can be liquidated. For example, if _collateralBasicPoints
     *  is 20000 (200%), _liquidationBasicPoints is 12500(125%) and stable/ARGC is $400, it means that it can be liquidated when stable/ARGC is less than $250.
     */
    function setCollateralPercentages(uint32 _collateralBasicPoints, uint32 _liquidationBasicPoints) public onlyOwner {
        require(_collateralBasicPoints > _liquidationBasicPoints, "Collateral percentage must be greater than liquidation percentage");
        require(_collateralBasicPoints > 10000 && _liquidationBasicPoints > 10000, "Collateral and liquidation percentages must be greater 100% (10000 basic points)");

        collateralBasicPoints = _collateralBasicPoints;
        liquidationBasicPoints = _liquidationBasicPoints;
    }

    function getCollateralBasicPoints() public view returns (uint32) {
        return collateralBasicPoints;
    }

    function getLiquidationBasicPoints() public view returns (uint32) {
        return liquidationBasicPoints;
    }

    //TODO: it does not make sense
    function getPosition(address userAddress, string memory token) public view returns (Position memory) {
        return positions[userAddress][token];
    }

    function addNewCollateralToken(string memory tokenSymbol, address erc20Contract) public onlyOwner {
        //TODO: ask for RatesOracle defintion
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

    function getMaxArgcAllowed(string memory collateralTokenSymbol, uint256 collateralTokenAmount) public view returns (uint256) {
        uint256 argcCollateralPeg = ratesContract.getArgencoinRate(collateralTokenSymbol);

        return ((collateralTokenAmount * argcCollateralPeg * ONE_HUNDRED_BASIC_POINTS) / (getCollateralBasicPoints())) / ONE_COLLATERAL_TOKEN_UNIT;
    }

    function mintArgencoin(uint256 argcAmount, string memory collateralTokenSymbol, uint256 collateralTokenAmount) public {
        IERC20 collateralContract = getCollateralTokenAddress(collateralTokenSymbol);

        require(getMaxArgcAllowed(collateralTokenSymbol, collateralTokenAmount) >= argcAmount, "Not enough collateral");

        uint256 centralBankBalanceBeforeTransfer = collateralContract.balanceOf(address(this));

        collateralContract.safeTransferFrom(msg.sender, address(this), collateralTokenAmount);

        require(collateralContract.balanceOf(address(this)) == centralBankBalanceBeforeTransfer + collateralTokenAmount, "Collateral transfer was not done");

        argencoinContract.mint(msg.sender, argcAmount);
    }
}
