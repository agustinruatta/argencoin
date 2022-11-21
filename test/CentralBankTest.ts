import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank, Argencoin, RatesOracle, Dai, Staking } from '../typechain-types';

describe('CentralBank', async function () {
  const [argcAdmin, centralBankOwner, daiOwner, strange, minter, stakingOwner] = await ethers.getSigners();
  const DEFAULT_COLLATERAL_PERCENTAGE = 150 * 100;
  const DEFAULT_LIQUIDATION_PERCENTAGE = 125 * 100;
  const DEFAULT_MINTING_FEE = 100;

  let centralBankContract: CentralBank;
  let argencoinContract: Argencoin;
  let ratesOracleContract: RatesOracle;
  let daiContract: Dai;
  let stakingContract: Staking;

  beforeEach(async () => {
    async function deployCentralBankContract() {
      return await (await ethers.getContractFactory('CentralBank'))
        .deploy(
          centralBankOwner.address,
          argencoinContract.address,
          ratesOracleContract.address,
          stakingContract.address,
          DEFAULT_COLLATERAL_PERCENTAGE,
          DEFAULT_LIQUIDATION_PERCENTAGE,
          DEFAULT_MINTING_FEE
        );
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

    async function deployStakingContract() {
      return await (await ethers.getContractFactory('Staking')).connect(stakingOwner).deploy();
    }

    argencoinContract = await loadFixture(deployArgencoinContract);
    ratesOracleContract = await loadFixture(deployRatesOracleContract);
    daiContract = await loadFixture(deployDaiContract);
    stakingContract = await loadFixture(deployStakingContract);
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

  describe('setMintingFee', () => {
    it('should not allow if is not owner', async () => {
      await expect(centralBankContract.setMintingFee(DEFAULT_MINTING_FEE)).to.be.revertedWith('Ownable: caller is not the owner');
    })

    it('should not allow to set more than 100%', async () => {
      await expect(centralBankContract.connect(centralBankOwner).setMintingFee(10001)).to.be.revertedWith('Max minting fee is 10000 basic points');
    })

    it('sets minting fee', async () => {
      await centralBankContract.connect(centralBankOwner).setMintingFee(2000);

      expect(await centralBankContract.getMintingFee()).to.be.eq(2000);
    })
  });

  describe('getMintingFee', () => {
    it('returns minting fee', async () => {
      expect(await centralBankContract.getMintingFee()).to.be.eq(DEFAULT_MINTING_FEE);
    })
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
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);
    })

    it('calculates it', async () => {
      expect(await centralBankContract.getMaxArgcAllowed('dai', ethers.utils.parseUnits('10'))).to.be.eq(ethers.utils.parseUnits('1980'));
    })
  })

  describe('calculateFeeAmount using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(centralBankOwner).setMockedRate(ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);
    })

    it('calculates it with 1% fee', async () => {
      await centralBankContract.connect(centralBankOwner).setMintingFee(100);
      expect(await centralBankContract.calculateFeeAmount('dai', ethers.utils.parseUnits('1980'))).to.be.eq(ethers.utils.parseUnits('0.1'));
    })

    it('calculates it with 10% fee', async () => {
      await centralBankContract.connect(centralBankOwner).setMintingFee(1000);

      expect(await centralBankContract.calculateFeeAmount('dai', ethers.utils.parseUnits('1980'))).to.be.eq(ethers.utils.parseUnits('1.1'));
    })
  })

  describe('mintArgencoin using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(centralBankOwner).setMockedRate(ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);
    })

    it('Should not allow mint less than 1 Argencoin', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1').sub(1), 'dai', ethers.utils.parseUnits('10')))
        .to.be.revertedWith('You must mint at least 1 Argencoin');
    });

    it('Should not allow mint unknown collateral token', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('2000'), 'unk', 10)).to.be.revertedWith('Unkwnown collateral token.')
    });

    it('Should not allow if is not enough collateral', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980').add(1), 'dai', ethers.utils.parseUnits('10')))
        .to.be.revertedWith('Not enough collateral');
    });

    it('Should throw an error if can not transfer collateral', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('20')))
        .to.be.revertedWith('Dai/insufficient-balance');
    });

    it('Should throw an error if transfer has not been approved', async () => {
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      
      await expect(centralBankContract.connect(strange).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('10')))
        .to.be.revertedWith('Dai/insufficient-balance');
    });

    it('mints Argencoin', async () => {
      //Prepare test
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));

      //Mint argencoin
      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('15'))
      
      //Check collateral was transfered
      expect(await daiContract.balanceOf(centralBankContract.address)).to.be.eq(ethers.utils.parseUnits('14.9'));

      //Check fee was transfered
      expect(await daiContract.balanceOf(stakingContract.address)).to.be.eq(ethers.utils.parseUnits('0.1'));

      //Check argencoin were minted
      expect(await argencoinContract.balanceOf(minter.address)).to.be.eq(ethers.utils.parseUnits('1980'));

      //Check position
      let position = await centralBankContract.getPosition(minter.address, 'dai');
      expect(position.collateralAmount).to.be.eq(ethers.utils.parseUnits('14.9'));
      expect(position.mintedArgcAmount).to.be.eq(ethers.utils.parseUnits('1980'));
    });
  });

  describe('burnArgencoin using DAI as collateral', () => {
    it('raise an error if user has not minted before', async () => {
      await expect(centralBankContract.burnArgencoin('dai')).to.be.revertedWith('You have not minted Argencoins with sent collateral');
    });
  })

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
      await centralBankContract.setCollateralPercentages(20000, 17500);

      expect(await centralBankContract.getCollateralBasicPoints()).to.be.eq(20000);
    })

    it('Should set liquidation percentage', async () => {
      centralBankContract = centralBankContract.connect(centralBankOwner);
      await centralBankContract.setCollateralPercentages(20000, 17500);

      expect(await centralBankContract.getLiquidationBasicPoints()).to.be.eq(17500);
    })
  });
});
