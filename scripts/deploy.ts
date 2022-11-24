import { ethers } from "hardhat";

async function main() {
  const [argcAdmin] = await ethers.getSigners();
  let centralBankOwner = argcAdmin;
  let ratesOracleOwner = argcAdmin;
  let stakingOwner = argcAdmin;
  let daiOwner = argcAdmin;

  const DEFAULT_COLLATERAL_PERCENTAGE = 150 * 100;
  const DEFAULT_LIQUIDATION_PERCENTAGE = 125 * 100;
  const DEFAULT_MINTING_FEE = 100;

  let argencoinContract = await (await ethers.getContractFactory('Argencoin')).connect(argcAdmin).deploy();

  let ratesOracleContract = await (await ethers.getContractFactory('RatesOracle')).connect(ratesOracleOwner).deploy();

  let daiContract = await (await ethers.getContractFactory('Dai')).connect(daiOwner).deploy(1);

  let stakingContract = await (await ethers.getContractFactory('Staking')).connect(stakingOwner)
    .deploy(stakingOwner.address, argencoinContract.address, daiContract.address);

  let centralBankContract = await (await ethers.getContractFactory('CentralBank'))
    .deploy(
      centralBankOwner.address,
      argencoinContract.address,
      ratesOracleContract.address,
      DEFAULT_COLLATERAL_PERCENTAGE,
      DEFAULT_LIQUIDATION_PERCENTAGE,
      DEFAULT_MINTING_FEE
    );
  
  await argencoinContract.deployed();
  await ratesOracleContract.deployed();
  await daiContract.deployed();
  await stakingContract.deployed();
  await centralBankContract.deployed();

  await argencoinContract.grantRole(await argencoinContract.MINTER_ROLE(), centralBankContract.address);

  let logMessage = `CentralBank deployed to ${centralBankContract.address}.
Argencoin deployed to ${argencoinContract.address}.
RatesOracle deployed to ${ratesOracleContract.address}.
Dai deployed to ${daiContract.address}.
Staking deployed to ${stakingContract.address}.
CentralBank deployed to ${centralBankContract.address}.`
  
  console.log(logMessage);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
