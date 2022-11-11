import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('CentralBank', function () {
  async function configFixtures() {
    const [deployer, owner, strange] = await ethers.getSigners();

    const centralBankContract = await (await ethers.getContractFactory('CentralBank')).deploy(owner.getAddress());

    return { centralBankContract, deployer, owner, strange };
  }

  function deployCentralBankContract() {
    return loadFixture(configFixtures);
  }

  describe('Deployment', function () {
    it('Should deploy it', async () =>  {
      const { centralBankContract } = await deployCentralBankContract();

      expect(centralBankContract).to.not.null;
    });

    it('Should set the right owner', async () =>  {
      const { centralBankContract, owner } = await deployCentralBankContract();

      expect(await centralBankContract.owner()).to.equal(await owner.getAddress());
    });
  });
});
