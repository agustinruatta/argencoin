import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank, Argencoin, RatesOracle, Dai } from '../typechain-types';

describe('CentralBank', async function () {
  const [deployer, owner, strange, minter] = await ethers.getSigners();
  const DAI_CONTRACT_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const TEN_ARGENCOINS = ethers.utils.parseUnits('10');

  let centralBankContract: CentralBank;
  let argencoinContract: Argencoin;
  let ratesOracleContract: RatesOracle;
  let daiContract: Dai;

  beforeEach(async () => {
    async function deployCentralBankContract() {
      return await (await ethers.getContractFactory('CentralBank')).deploy(owner.getAddress(), argencoinContract.address, ratesOracleContract.address);
    }

    async function deployArgencoinContract() {
      return await (await ethers.getContractFactory('Argencoin')).deploy();
    }

    async function deployRatesOracleContract() {
      return await (await ethers.getContractFactory('RatesOracle')).deploy();
    }

    async function deployDaiContract() {
      return await (await ethers.getContractFactory('Dai')).deploy(1);
    }

    argencoinContract = await loadFixture(deployArgencoinContract);
    ratesOracleContract = await loadFixture(deployRatesOracleContract);
    daiContract = await loadFixture(deployDaiContract);
    centralBankContract = await loadFixture(deployCentralBankContract);
  })

  describe('Deployment', () => {
    it('Should deploy it', async () =>  {
      expect(centralBankContract).to.not.null;
    });

    it('Should set the right owner', async () =>  {
      expect(await centralBankContract.owner()).to.equal(await owner.getAddress());
    });
  });

  describe('getPosition', () => {
    it('Should return empty position', async () =>  {
      let position = await centralBankContract.getPosition(strange.getAddress(), 'dai');

      expect(position.collateralAmount).to.be.eq(0);
      expect(position.mintedArgcAmount).to.be.eq(0);
    });
  });

  describe('addNewCollateralToken', () => {
    it('Should not allow if is not owner', async () => {
      await expect(centralBankContract.connect(strange).addNewCollateralToken('dai', DAI_CONTRACT_ADDRESS)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow add token again', async () => {
      centralBankContract = centralBankContract.connect(owner);

      centralBankContract.addNewCollateralToken('dai', DAI_CONTRACT_ADDRESS);

      await expect(centralBankContract.addNewCollateralToken('dai', DAI_CONTRACT_ADDRESS)).to.be.revertedWith('Token is already set. Please, call \'editColleteralToken\' function.')
    });

    it('Allows to add token', async () => {
      centralBankContract = centralBankContract.connect(owner);

      await centralBankContract.addNewCollateralToken('dai', DAI_CONTRACT_ADDRESS);

      expect(await centralBankContract.getCollateralTokenAddress('dai')).to.be.eq(DAI_CONTRACT_ADDRESS);
    });
  });

  describe('editCollateralToken', () => {
    it('Should not allow if is not owner', async () => {
      await expect(centralBankContract.connect(strange).editCollateralToken('dai', DAI_CONTRACT_ADDRESS)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow edit token if is not set', async () => {
      centralBankContract = centralBankContract.connect(owner);

      await expect(centralBankContract.editCollateralToken('dai', DAI_CONTRACT_ADDRESS)).to.be.revertedWith('Token is not set yet. Please, call \'addNewColleteralToken\' function.')
    });

    it('Allows to edit token', async () => {
      centralBankContract = centralBankContract.connect(owner);

      await centralBankContract.addNewCollateralToken('dai', USDC_CONTRACT_ADDRESS);

      await centralBankContract.editCollateralToken('dai', DAI_CONTRACT_ADDRESS);

      expect(await centralBankContract.getCollateralTokenAddress('dai')).to.be.eq(DAI_CONTRACT_ADDRESS);
    });
  });

  describe('getCollateralToken', () => {
    it('Raise error if token is not set', async () =>  {
      await expect(centralBankContract.getCollateralTokenAddress('dai')).to.be.revertedWith('Unkwnown collateral token.');
    });
  });

  describe('mintArgencoin', () => {
    const DAI_ARG_RATE = 30000;
    const COLLATERAL_PERCENTAGE = 150000;

    this.beforeEach(() => {
      ratesOracleContract.setMockedRate(DAI_ARG_RATE);
      centralBankContract.setCollateralPercentages(COLLATERAL_PERCENTAGE, 12500);
    })

    it('Should not allow mint unknown collateral token', async () => {
      await expect(centralBankContract.mintArgencoin(TEN_ARGENCOINS, 'unk', 10)).to.be.revertedWith('Unkwnown collateral token.')
    });

    it('Should not allow if is not enough collateral', async () => {
      //TODO
    });
  });

  describe('setCollateralPercentages', () => {
    it('Should not allow if is not owner', async () => {
      await expect(centralBankContract.setCollateralPercentages(15000, 12500)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow it if liquidation percentage is not less than collateral percentage', async () => {
      centralBankContract = centralBankContract.connect(owner);

      await expect(centralBankContract.setCollateralPercentages(12500, 12500)).to.be.revertedWith('Collateral percentage must be greater than liquidation percentage');
    });

    it('Should not allow if collateral percentage is not more than 100%', async () => {
      centralBankContract = centralBankContract.connect(owner);

      await expect(centralBankContract.setCollateralPercentages(10000, 9900)).to.be.revertedWith('Collateral and liquidation percentages must be greater 100% (10000 basic points)');
    })

    it('Should not allow if liquidation percentage is not more than 100%', async () => {
      centralBankContract = centralBankContract.connect(owner);

      await expect(centralBankContract.setCollateralPercentages(20000, 10000)).to.be.revertedWith('Collateral and liquidation percentages must be greater 100% (10000 basic points)');
    })

    it('Should set collateral percentage', async () => {
      centralBankContract = centralBankContract.connect(owner);
      await centralBankContract.setCollateralPercentages(15000, 12500);

      expect(await centralBankContract.getCollateralBasicPoints()).to.be.eq(15000);
    })

    it('Should set liquidation percentage', async () => {
      centralBankContract = centralBankContract.connect(owner);
      await centralBankContract.setCollateralPercentages(20000, 12500);

      expect(await centralBankContract.getLiquidationBasicPoints()).to.be.eq(12500);
    })
  });
});
