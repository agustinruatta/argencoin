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
        argencoinContract.address,
        daiContract.address
      );
    }

    [unused, stakingOwner, argencoinOwner, daiOwner, strange] = await ethers.getSigners();

    argencoinContract = await loadFixture(deployArgencoinContract);
    daiContract = await loadFixture(deployDaiContract);
    stakingContract = await loadFixture(deployStakingContract);

    await daiContract.connect(daiOwner).mint(stakingContract.address, ethers.utils.parseUnits("10"));
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

  describe('editRewardToken', () => {
    it('raise an error if is not owner', async () => {
      await expect(stakingContract.connect(strange).editRewardToken(daiContract.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('edit rewards token', async () => {
      await stakingContract.connect(stakingOwner).editRewardToken(argencoinContract.address);

      expect(await stakingContract.rewardToken()).to.be.eq(argencoinContract.address);
    });
  });

  describe('editArgencoinToken', () => {
    it('raise an error if is not owner', async () => {
      await expect(stakingContract.connect(strange).editArgencoinToken(argencoinContract.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('edit rewards token', async () => {
      await stakingContract.connect(stakingOwner).editArgencoinToken(daiContract.address);

      expect(await stakingContract.argencoinToken()).to.be.eq(daiContract.address);
    });
  });

  describe('stake', () => {
    it('raise an error if amount is 0', async () => {
      await expect(stakingContract.stake(0)).to.be.revertedWith('Amount to stake must be greater than 0');
    })

    it('raise an error if transfer was not approved', async () => {
      await expect(stakingContract.stake(ethers.utils.parseUnits("10"))).to.be.revertedWith('Dai/insufficient-balance');
    })

    it('stakes', async () => {
      await stakingContract.connect(stakingOwner).notifyRewardAmount(1000, 500);
    });
  });
})
