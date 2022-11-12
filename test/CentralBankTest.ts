import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank } from '../typechain-types';

describe('CentralBank', async function () {
  const [deployer, owner, strange] = await ethers.getSigners();
  const DAI_CONTRACT_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  let centralBankContract: CentralBank;

  beforeEach(async () => {
    async function deployContract() {
      return await (await ethers.getContractFactory('CentralBank')).deploy(owner.getAddress());
    }

    centralBankContract = await loadFixture(deployContract);
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

      centralBankContract.addNewCollateralToken('dai', DAI_CONTRACT_ADDRESS);

      expect(await centralBankContract.getCollateralTokenAddress('dai')).to.be.eq(DAI_CONTRACT_ADDRESS);
    });
  });
});
