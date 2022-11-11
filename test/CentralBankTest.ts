import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { CentralBank } from '../typechain-types';

describe('CentralBank', async function () {
  const [deployer, owner, strange] = await ethers.getSigners();
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
});
