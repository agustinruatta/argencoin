import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank, Argencoin } from '../typechain-types';

describe('CentralBank', async function () {
  const [deployer, owner, strange] = await ethers.getSigners();
  const DAI_CONTRACT_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  let centralBankContract: CentralBank;
  let argencoinContract: Argencoin;

  beforeEach(async () => {
    async function deployCentralBankContract() {
      return await (await ethers.getContractFactory('CentralBank')).deploy(owner.getAddress(), argencoinContract.address);
    }

    async function deployArgencoinContract() {
      return await (await ethers.getContractFactory('Argencoin')).deploy();
    }

    argencoinContract = await loadFixture(deployArgencoinContract);
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
      await expect(centralBankContract.getCollateralTokenAddress('dai')).to.be.revertedWith('token is not set as collateral');
    });
  });
});
