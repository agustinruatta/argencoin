import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Argencoin, Dai, Staking } from '../typechain-types';

describe('Staking', function () {
  let [unused, stakingOwner, argencoinOwner, daiOwner, strange] : SignerWithAddress[] = [];

  let stakingContract: Staking;
  let argencoinContract: Argencoin;
  let daiContract: Dai;

  beforeEach(async () => {
    async function deployArgencoinContract() {
      return await (await ethers.getContractFactory('Argencoin')).connect(argencoinOwner).deploy();
    }

    async function deployDaiContract() {
      return await (await ethers.getContractFactory('Dai')).connect(daiOwner).deploy(1);
    }

    async function deployStakingContract() {
      return await (await ethers.getContractFactory('Staking')).deploy(
        stakingOwner.address,
        argencoinContract.address
      );
    }

    [unused, stakingOwner, argencoinOwner, daiOwner, strange] = await ethers.getSigners();

    argencoinContract = await loadFixture(deployArgencoinContract);
    daiContract = await loadFixture(deployDaiContract);

    stakingContract = await loadFixture(deployStakingContract);
  })

  describe('Deployment', () => {
    it('should deploy it', async () =>  {
      expect(stakingContract).to.not.null;
    });

    it('should set the right owner', async () =>  {
      expect(await stakingContract.owner()).to.equal(stakingOwner.address);
    });

    it('should set contracts', async () => {
        expect(await stakingContract.argencoinToken()).to.be.eq(argencoinContract.address);
    });
  });

  describe('addRewardToken', () => {
    it('raise an error if is not owner', async () => {
      await expect(stakingContract.connect(strange).addRewardToken('dai', daiContract.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('set rewards token', async () => {
      await stakingContract.connect(stakingOwner).addRewardToken('dai', daiContract.address);

      expect(await stakingContract.rewardTokenContracts('dai')).to.be.eq(daiContract.address);
    });
  });

  describe('rewardPerToken', () => {
    it('returns 0 if there is no supply', async () => {
      expect(await stakingContract.rewardPerToken()).to.be.eq(0);
    });
  });

  describe('lastApplicableRewardTime', () => {
    it('returns finishAt because is the minimum', async () => {
      expect(await stakingContract.lastApplicableRewardTime()).to.be.eq(0);
    });
  });
});
