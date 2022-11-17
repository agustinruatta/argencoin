import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank, Argencoin, RatesOracle, Dai } from '../typechain-types';

describe('CentralBank', async function () {
  const [argcAdmin, centralBankOwner, daiOwner, strange, minter] = await ethers.getSigners();

  let centralBankContract: CentralBank;
  let argencoinContract: Argencoin;
  let ratesOracleContract: RatesOracle;
  let daiContract: Dai;

  beforeEach(async () => {
    async function deployCentralBankContract() {
      return await (await ethers.getContractFactory('CentralBank')).deploy(centralBankOwner.address, argencoinContract.address, ratesOracleContract.address);
    }

    async function deployArgencoinContract() {
      return await (await ethers.getContractFactory('Argencoin')).connect(argcAdmin).deploy();
    }

    async function deployRatesOracleContract() {
      return await (await ethers.getContractFactory('RatesOracle')).deploy();
    }

    async function deployDaiContract() {
      return await (await ethers.getContractFactory('Dai')).connect(daiOwner).deploy(1);
    }

    argencoinContract = await loadFixture(deployArgencoinContract);
    ratesOracleContract = await loadFixture(deployRatesOracleContract);
    daiContract = await loadFixture(deployDaiContract);
    centralBankContract = await loadFixture(deployCentralBankContract);

    await argencoinContract.grantRole(await argencoinContract.MINTER_ROLE(), centralBankContract.address)
  })

  describe('Deployment', () => {
    it('Should deploy it', async () =>  {
      expect(centralBankContract).to.not.null;
    });

    it('Should set the right owner', async () =>  {
      expect(await centralBankContract.owner()).to.equal(await centralBankOwner.getAddress());
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
      await expect(centralBankContract.connect(strange).addNewCollateralToken('dai', daiContract.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow add token again', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      centralBankContract.addNewCollateralToken('dai', daiContract.address);

      await expect(centralBankContract.addNewCollateralToken('dai', daiContract.address)).to.be.revertedWith('Token is already set. Please, call \'editColleteralToken\' function.')
    });

    it('Allows to add token', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      await centralBankContract.addNewCollateralToken('dai', daiContract.address);

      expect(await centralBankContract.getCollateralTokenAddress('dai')).to.be.eq(daiContract.address);
    });
  });

  describe('editCollateralToken', () => {
    it('Should not allow if is not owner', async () => {
      await expect(centralBankContract.connect(strange).editCollateralToken('dai', daiContract.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow edit token if is not set', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      await expect(centralBankContract.editCollateralToken('dai', daiContract.address)).to.be.revertedWith('Token is not set yet. Please, call \'addNewColleteralToken\' function.')
    });

    it('Allows to edit token', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

      await centralBankContract.addNewCollateralToken('dai', USDC_CONTRACT_ADDRESS);

      await centralBankContract.editCollateralToken('dai', daiContract.address);

      expect(await centralBankContract.getCollateralTokenAddress('dai')).to.be.eq(daiContract.address);
    });
  });

  describe('getCollateralToken', () => {
    it('Raise error if token is not set', async () =>  {
      await expect(centralBankContract.getCollateralTokenAddress('dai')).to.be.revertedWith('Unkwnown collateral token.');
    });
  });

  describe('getMaxArgcAllowed using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(centralBankOwner).setMockedRate(ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).setCollateralPercentages(150 * 100, 125 * 100);
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);
    })

    it('calculates it', async () => {
      expect(await centralBankContract.getMaxArgcAllowed('dai', ethers.utils.parseUnits('10'))).to.be.eq(ethers.utils.parseUnits('2000'));
    })
  })

  describe('mintArgencoin using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(centralBankOwner).setMockedRate(ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).setCollateralPercentages(150 * 100, 125 * 100);
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);
    })

    it('Should not allow mint unknown collateral token', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('2000'), 'unk', 10)).to.be.revertedWith('Unkwnown collateral token.')
    });

    it('Should not allow if is not enough collateral', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('2000').add(1), 'dai', ethers.utils.parseUnits('10')))
        .to.be.revertedWith('Not enough collateral');
    });

    it('Should throw an error if can not transfer collateral', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('2000'), 'dai', ethers.utils.parseUnits('20')))
        .to.be.revertedWith('Dai/insufficient-balance');
    });

    it('Should throw an error if transfer has not been approved', async () => {
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      
      await expect(centralBankContract.connect(strange).mintArgencoin(ethers.utils.parseUnits('2000'), 'dai', ethers.utils.parseUnits('10')))
        .to.be.revertedWith('Dai/insufficient-balance');
    });

    it('mints Argencoin', async () => {
      //Prepare test
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));

      //Mint argencoin
      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('2000'), 'dai', ethers.utils.parseUnits('15'))
      
      //Check that collateral balance 
      expect(await daiContract.balanceOf(centralBankContract.address)).to.be.eq(ethers.utils.parseUnits('15'));
      expect(await argencoinContract.balanceOf(minter.address)).to.be.eq(ethers.utils.parseUnits('2000'));
    });
  });

  describe('setCollateralPercentages', () => {
    it('Should not allow if is not owner', async () => {
      await expect(centralBankContract.setCollateralPercentages(15000, 12500)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow it if liquidation percentage is not less than collateral percentage', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      await expect(centralBankContract.setCollateralPercentages(12500, 12500)).to.be.revertedWith('Collateral percentage must be greater than liquidation percentage');
    });

    it('Should not allow if collateral percentage is not more than 100%', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      await expect(centralBankContract.setCollateralPercentages(10000, 9900)).to.be.revertedWith('Collateral and liquidation percentages must be greater 100% (10000 basic points)');
    })

    it('Should not allow if liquidation percentage is not more than 100%', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);

      await expect(centralBankContract.setCollateralPercentages(20000, 10000)).to.be.revertedWith('Collateral and liquidation percentages must be greater 100% (10000 basic points)');
    })

    it('Should set collateral percentage', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);
      await centralBankContract.setCollateralPercentages(15000, 12500);

      expect(await centralBankContract.getCollateralBasicPoints()).to.be.eq(15000);
    })

    it('Should set liquidation percentage', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);
      await centralBankContract.setCollateralPercentages(20000, 12500);

      expect(await centralBankContract.getLiquidationBasicPoints()).to.be.eq(12500);
    })
  });
});
