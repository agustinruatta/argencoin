import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Argencoin, Dai, Staking } from '../typechain-types';

describe('Staking', function () {
  let [unused, stakingOwner, argencoinOwner, daiOwner, strange, userWithArgencoins] : SignerWithAddress[] = [];

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

    [unused, stakingOwner, argencoinOwner, daiOwner, strange, userWithArgencoins] = await ethers.getSigners();

    argencoinContract = await loadFixture(deployArgencoinContract);
    daiContract = await loadFixture(deployDaiContract);
    stakingContract = await loadFixture(deployStakingContract);

    await daiContract.connect(daiOwner).mint(stakingContract.address, ethers.utils.parseUnits("10"));

    await argencoinContract.connect(argencoinOwner).grantRole(await argencoinContract.MINTER_ROLE(), argencoinOwner.address);
    await argencoinContract.connect(argencoinOwner).mint(userWithArgencoins.address, ethers.utils.parseUnits("300"));
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
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("5"), 3600);
    });
  });

  describe('setNextReward', () => {
    it('set for first time', async () => {
      //Execute
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("5"), 3600);

      //Asserts
      expect(await stakingContract.rewardRate()).to.be.eq(ethers.utils.parseUnits("5").div(3600));

      const latestBlock = await ethers.provider.getBlock("latest");
      expect(await stakingContract.finishAt()).to.be.eq(latestBlock.timestamp + 3600);
      expect(await stakingContract.updatedAt()).to.be.eq(latestBlock.timestamp || 0);
    });

    it('raise an error if is trying to set it but previous set was not done yet', async() => {
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("2"), 3600);

      await expect(stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("2"), 3600)).to.be.revertedWith('Previous reward has not finished yet');
    })

    it('raise an error if reward rate is 0', async () => {
      await expect(stakingContract.connect(stakingOwner).setNextReward(100, 3600)).to.be.revertedWith('Reward rate must be greater than 0');
    });

    it('raise an error if staking has not enough funds to reward', async () => {
      await expect(stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("100"), 3600)).to.be.revertedWith('Not enough funds in staking to give that amount of reward');
    });

    it('set after someone has staked', async () => {
      await argencoinContract.connect(userWithArgencoins).approve(stakingContract.address, ethers.utils.parseUnits("100"));

      //Set reward
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("2"), 1000);

      //Stake
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 100);
      await stakingContract.connect(userWithArgencoins).stake(ethers.utils.parseUnits("10"));

      //Set new next reward
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 1000);
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("5"), 5000);

      //Asserts
      expect(await stakingContract.rewardRate()).to.be.eq(ethers.utils.parseUnits("5").div(5000));
      expect(await stakingContract.rewardPerTokenStored()).to.be.eq(ethers.utils.parseUnits("18", 16));

      const latestBlock = await ethers.provider.getBlock("latest");
      expect(await stakingContract.finishAt()).to.be.eq(latestBlock.timestamp + 5000);
      expect(await stakingContract.updatedAt()).to.be.eq(latestBlock.timestamp);
    });
  });
})
