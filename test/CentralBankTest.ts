import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank, Argencoin, RatesOracle, Dai, Staking } from '../typechain-types';

describe('CentralBank', function () {
  let [argcAdmin, centralBankOwner, daiOwner, ratesOracleOwner, strange, minter, stakingOwner, strange2]: SignerWithAddress[] = [];;
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
      return await (await ethers.getContractFactory('RatesOracle')).connect(ratesOracleOwner).deploy();
    }

    async function deployDaiContract() {
      return await (await ethers.getContractFactory('Dai')).connect(daiOwner).deploy(1);
    }

    async function deployStakingContract() {
      return await (await ethers.getContractFactory('Staking')).connect(stakingOwner).deploy(stakingOwner.address, argencoinContract.address);
    }

    [argcAdmin, centralBankOwner, daiOwner, ratesOracleOwner, strange, minter, stakingOwner, strange2] = await ethers.getSigners();

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
      centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);

      await expect(centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address)).to.be.revertedWith('Token is already set. Please, call \'editColleteralToken\' function.')
    });

    it('Allows to add token', async () => {
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);

      expect(await centralBankContract.connect(centralBankOwner).getCollateralTokenContract('dai')).to.be.eq(daiContract.address);
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
      await expect(centralBankContract.connect(centralBankOwner).editCollateralToken('dai', daiContract.address)).to.be.revertedWith('Token is not set yet. Please, call \'addNewColleteralToken\' function.')
    });

    it('Allows to edit token', async () => {
      const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', USDC_CONTRACT_ADDRESS);

      await centralBankContract.connect(centralBankOwner).editCollateralToken('dai', daiContract.address);

      expect(await centralBankContract.connect(centralBankOwner).getCollateralTokenContract('dai')).to.be.eq(daiContract.address);
    });
  });

  describe('getCollateralTokenContract', () => {
    it('Raise error if token is not set', async () =>  {
      await expect(centralBankContract.getCollateralTokenContract('dai')).to.be.revertedWith('Unkwnown collateral token.');
    });
  });

  describe('calculateMaxAllowedArgcToMint using DAI as collateral', () => {
    it('calculates it with 300 rate', async () => {
      expect(await centralBankContract.calculateMaxAllowedArgcToMint(ethers.utils.parseUnits('300'), ethers.utils.parseUnits('10')))
        .to.be.eq(ethers.utils.parseUnits('1980'));
    })

    it('calculates it with 450 rate', async () => {
      expect(await centralBankContract.calculateMaxAllowedArgcToMint(ethers.utils.parseUnits('450'), ethers.utils.parseUnits('10')))
        .to.be.eq(ethers.utils.parseUnits('2970'));
    })
  })

  describe('calculateFeeAmount using DAI as collateral', () => {
    it('calculates it with 1% fee', async () => {
      await centralBankContract.connect(centralBankOwner).setMintingFee(100);
      expect(await centralBankContract.calculateFeeAmount(ethers.utils.parseUnits('300'), ethers.utils.parseUnits('1980')))
        .to.be.eq(ethers.utils.parseUnits('0.1'));
    })

    it('calculates it with 10% fee', async () => {
      await centralBankContract.connect(centralBankOwner).setMintingFee(1000);

      expect(await centralBankContract.calculateFeeAmount(ethers.utils.parseUnits('300'), ethers.utils.parseUnits('1980')))
        .to.be.eq(ethers.utils.parseUnits('1.1'));
    })
  })

  describe('mintArgencoin using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);
    })

    it('Should not allow mint less than 1 Argencoin', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1').sub(1), 'dai', ethers.utils.parseUnits('10')))
        .to.be.revertedWith('You must mint at least 1 Argencoin');
    });

    it('Should not allow mint unknown collateral token', async () => {
      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('2000'), 'unk', 10))
        .to.be.revertedWith('Unkwnown collateral token.')
    });

    it('should not allow if user has a previous minted position', async () => {
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));
      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1'), 'dai', ethers.utils.parseUnits('1'))

      await expect(centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1'), 'dai', ethers.utils.parseUnits('1')))
        .to.be.revertedWith('You have a previous minted position. Burn it.');
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

    it('mints Argencoin with very overcollateralized position', async () => {
      //Prepare test
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));

      //Mint argencoin
      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('20'))
      
      //Check collateral was transfered
      expect(await daiContract.balanceOf(centralBankContract.address)).to.be.eq(ethers.utils.parseUnits('19.9'));

      //Check fee was transfered
      expect(await daiContract.balanceOf(stakingContract.address)).to.be.eq(ethers.utils.parseUnits('0.1'));

      //Check argencoin were minted
      expect(await argencoinContract.balanceOf(minter.address)).to.be.eq(ethers.utils.parseUnits('1980'));

      //Check position
      let position = await centralBankContract.getPosition(minter.address, 'dai');
      expect(position.collateralAmount).to.be.eq(ethers.utils.parseUnits('19.9'));
      expect(position.mintedArgcAmount).to.be.eq(ethers.utils.parseUnits('1980'));
      expect(position.liquidationPriceLimit).to.be.eq(ethers.utils.parseUnits("24750").div("199"));
    });

    it('mints Argencoin with no very overcollateralized position', async () => {
      //Prepare test
      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));

      //Mint argencoin
      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('10'))
      
      //Check collateral was transfered
      expect(await daiContract.balanceOf(centralBankContract.address)).to.be.eq(ethers.utils.parseUnits('9.9'));

      //Check fee was transfered
      expect(await daiContract.balanceOf(stakingContract.address)).to.be.eq(ethers.utils.parseUnits('0.1'));

      //Check argencoin were minted
      expect(await argencoinContract.balanceOf(minter.address)).to.be.eq(ethers.utils.parseUnits('1980'));

      //Check position
      let position = await centralBankContract.getPosition(minter.address, 'dai');
      expect(position.collateralAmount).to.be.eq(ethers.utils.parseUnits('9.9'));
      expect(position.mintedArgcAmount).to.be.eq(ethers.utils.parseUnits('1980'));
      expect(position.liquidationPriceLimit).to.be.eq(ethers.utils.parseUnits("250"));
    });
  });

  describe('burnArgencoin using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);

      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));

      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('15'))
    })

    it('raise an error if user has not minted before', async () => {
      await expect(centralBankContract.connect(strange).burnArgencoin('dai'))
        .to.be.revertedWith('You have not minted Argencoins with sent collateral');
    });

    it('raise an error if user has not approved Argencoin tranfer', async() => {
      await expect(centralBankContract.connect(minter).burnArgencoin('dai'))
        .to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('burns Argencoin', async () => {
      //Prepare test
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('600'));
      await argencoinContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('1980'))

      let totalArgcSupplyBeforeBurning = await argencoinContract.totalSupply();
      let totalMintedDaiBeforeBurning = await daiContract.balanceOf(minter.address);

      //Burn argencoins
      await centralBankContract.connect(minter).burnArgencoin('dai');

      //Check position was removed
      let position = await centralBankContract.getPosition(minter.address, 'dai');
      expect(position.collateralAmount).to.be.eq(0);
      expect(position.mintedArgcAmount).to.be.eq(0);
      expect(position.liquidationPriceLimit).to.be.eq(0);

      //Check Argencoins were burned
      expect(await argencoinContract.totalSupply()).to.be.eq(totalArgcSupplyBeforeBurning.sub(ethers.utils.parseUnits('1980')));

      //Check collateral amount was returned
      expect(await daiContract.balanceOf(minter.address)).to.be.eq(totalMintedDaiBeforeBurning.add(ethers.utils.parseUnits('14.9')));
    });
  })

  describe('calculateLiquidationPriceLimit', () => {
    it('calculates it when it is not very overcollateralized', async () => {
      expect(await centralBankContract.calculateLiquidationPriceLimit(ethers.utils.parseUnits('2000'), DEFAULT_LIQUIDATION_PERCENTAGE, ethers.utils.parseUnits('10')))
        .to.be.eq(ethers.utils.parseUnits('250'));
    });

    it('calculates it when it is very overcollateralized', async () => {
      expect(await centralBankContract.calculateLiquidationPriceLimit(ethers.utils.parseUnits('2000'), DEFAULT_LIQUIDATION_PERCENTAGE, ethers.utils.parseUnits('40')))
        .to.be.eq(ethers.utils.parseUnits('62.5'));
    });
  });

  describe('liquidatePosition using DAI as collateral', () => {
    beforeEach(async () => {
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('300'));
      await centralBankContract.connect(centralBankOwner).addNewCollateralToken('dai', daiContract.address);

      await daiContract.connect(daiOwner).mint(minter.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(daiOwner).mint(strange.address, ethers.utils.parseUnits('20'));

      await daiContract.connect(minter).approve(centralBankContract.address, ethers.utils.parseUnits('20'));
      await daiContract.connect(strange).approve(centralBankContract.address, ethers.utils.parseUnits('20'));

      await centralBankContract.connect(minter).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('15'));
      await centralBankContract.connect(strange).mintArgencoin(ethers.utils.parseUnits('1980'), 'dai', ethers.utils.parseUnits('15'));
    })

    it('No position were found', async () => {
      await expect(centralBankContract.connect(strange).liquidatePosition(strange2.address, 'dai')).to.be.revertedWith('Position not found');
    });

    it('raise an error if position is not under liquidation value', async () => {
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('250'));
      await expect(centralBankContract.connect(strange).liquidatePosition(minter.address, 'dai')).to.be.revertedWith('Position is not under liquidation value');
    });

    it('raise an error if user has not approved Argencoin tranfer', async () => {
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('165'));

      await expect(centralBankContract.connect(strange).liquidatePosition(minter.address, 'dai'))
        .to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('liquidates position', async () => {
      //Prepare test
      await ratesOracleContract.connect(ratesOracleOwner).setArgencoinRate('dai', ethers.utils.parseUnits('165'));
      let a = await argencoinContract.connect(strange).approve(centralBankContract.address, ethers.utils.parseUnits('1980'));

      let liquidatorDaiBalanceBeforeLiquidation = await daiContract.balanceOf(strange.address);
      let liquidatorArgencoinBalanceBeforeLiquidation = await argencoinContract.balanceOf(strange.address);
      let argencoinBalanceBeforeLiquidation = argencoinContract.totalSupply();

      //Liquidate position
      await centralBankContract.connect(strange).liquidatePosition(minter.address, 'dai');

      //Check position were removed
      let position = await centralBankContract.getPosition(minter.address, 'dai');
      expect(position.collateralAmount).to.be.eq(0);
      expect(position.mintedArgcAmount).to.be.eq(0);
      expect(position.liquidationPriceLimit).to.be.eq(0);

      //Check argencoins were burned
      expect(await argencoinContract.balanceOf(strange.address)).to.be.eq((await liquidatorArgencoinBalanceBeforeLiquidation).sub(ethers.utils.parseUnits('1980')));
      expect(await argencoinContract.totalSupply()).to.be.eq((await argencoinBalanceBeforeLiquidation).sub(ethers.utils.parseUnits('1980')));

      //Check dai was given
      expect(await daiContract.balanceOf(strange.address)).to.be.eq(liquidatorDaiBalanceBeforeLiquidation.add(ethers.utils.parseUnits('14.9')));
    });
  });

  describe('setCollateralPercentages', () => {
    it('Should not allow if is not owner', async () => {
      await expect(centralBankContract.setCollateralPercentages(15000, 12500)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Should not allow it if liquidation percentage is not less than collateral percentage', async () => {
      await expect(centralBankContract.connect(centralBankOwner).setCollateralPercentages(12500, 12500)).to.be.revertedWith('Collateral percentage must be greater than liquidation percentage');
    });

    it('Should not allow if collateral percentage is not more than 100%', async () => {
      await expect(centralBankContract.connect(centralBankOwner).setCollateralPercentages(10000, 9900)).to.be.revertedWith('Collateral and liquidation percentages must be greater 100% (10000 basic points)');
    })

    it('Should not allow if liquidation percentage is not more than 100%', async () => {
      await expect(centralBankContract.connect(centralBankOwner).setCollateralPercentages(20000, 10000)).to.be.revertedWith('Collateral and liquidation percentages must be greater 100% (10000 basic points)');
    })

    it('Should set collateral percentage', async () => {
      await centralBankContract.connect(centralBankOwner).setCollateralPercentages(20000, 17500);

      expect(await centralBankContract.getCollateralBasicPoints()).to.be.eq(20000);
    })

    it('Should set liquidation percentage', async () => {
      await centralBankContract.connect(centralBankOwner).setCollateralPercentages(20000, 17500);

      expect(await centralBankContract.getLiquidationBasicPoints()).to.be.eq(17500);
    })
  });
});
