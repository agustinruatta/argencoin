import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Staking } from '../typechain-types';

describe('Staking', function () {
  let owner: SignerWithAddress;
  let strange: SignerWithAddress;

  let stakingContract: Staking;

  beforeEach(async () => {
    async function deployStakingContract() {
      return await (await ethers.getContractFactory('Staking')).deploy();
    }

    [owner, strange] = await ethers.getSigners();

    stakingContract = await loadFixture(deployStakingContract);
  })

  describe('Deployment', () => {
    it('Should deploy it', async () =>  {
      expect(stakingContract).to.not.null;
    });

    it('Should set the right owner', async () =>  {
      expect(await stakingContract.owner()).to.equal(owner.address);
    });
  });
});
