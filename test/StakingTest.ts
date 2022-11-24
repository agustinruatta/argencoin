import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Argencoin, Dai, Staking } from '../typechain-types';

describe('Staking', function () {
  let [unused, stakingOwner, argencoinOwnerA, daiOwner, strange, userWithArgencoinsA, userWithArgencoinsB] : SignerWithAddress[] = [];

  let stakingContract: Staking;
  let argencoinContract: Argencoin;
  let daiContract: Dai;

  beforeEach(async () => {
    async function deployArgencoinContract() {
      return await (await ethers.getContractFactory('Argencoin')).connect(argencoinOwnerA).deploy();
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

    [unused, stakingOwner, argencoinOwnerA, daiOwner, strange, userWithArgencoinsA, userWithArgencoinsB] = await ethers.getSigners();

    argencoinContract = await loadFixture(deployArgencoinContract);
    daiContract = await loadFixture(deployDaiContract);
    stakingContract = await loadFixture(deployStakingContract);

    await daiContract.connect(daiOwner).mint(stakingContract.address, ethers.utils.parseUnits("10"));

    await argencoinContract.connect(argencoinOwnerA).grantRole(await argencoinContract.MINTER_ROLE(), argencoinOwnerA.address);
    await argencoinContract.connect(argencoinOwnerA).mint(userWithArgencoinsA.address, ethers.utils.parseUnits("500"));
    await argencoinContract.connect(argencoinOwnerA).mint(userWithArgencoinsB.address, ethers.utils.parseUnits("1000"));
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
      await expect(stakingContract.stake(ethers.utils.parseUnits("10"))).to.be.revertedWith('ERC20: insufficient allowance');
    })

    it('updates balance', async () => {
      await argencoinContract.connect(userWithArgencoinsA).approve(stakingContract.address, ethers.utils.parseUnits("500"));
      await stakingContract.connect(userWithArgencoinsA).stake(ethers.utils.parseUnits("10"));

      expect(await stakingContract.balanceOf(userWithArgencoinsA.address)).to.be.eq(ethers.utils.parseUnits("10"));
    })
  });

  describe('withdraw', () => {
    it('raise an error if amount is 0', async () => {
      await expect(stakingContract.withdraw(0)).to.be.revertedWith('Amount to withdraw must be greater than 0');
    })

    it('updates balance', async () => {
      await argencoinContract.connect(userWithArgencoinsA).approve(stakingContract.address, ethers.utils.parseUnits("500"));
      await stakingContract.connect(userWithArgencoinsA).stake(ethers.utils.parseUnits("10"));

      await stakingContract.connect(userWithArgencoinsA).withdraw(ethers.utils.parseUnits("4"));

      expect(await stakingContract.balanceOf(userWithArgencoinsA.address)).to.be.eq(ethers.utils.parseUnits("6"));
    })
  });

  describe('collectReward', () => {
    beforeEach(async () => {
      await argencoinContract.connect(userWithArgencoinsA).approve(stakingContract.address, ethers.utils.parseUnits("500"));
      await argencoinContract.connect(userWithArgencoinsB).approve(stakingContract.address, ethers.utils.parseUnits("1000"));
    })

    it('stakes one user', async () => {
      //Reward 10 dai in the next 1000 seconds
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("10"), 1000);

      //User A stake after 100 seconds
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 100);
      await stakingContract.connect(userWithArgencoinsA).stake(ethers.utils.parseUnits("10"));

      //Collect rewards after all has ended
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 5000);
      await stakingContract.connect(userWithArgencoinsA).collectReward();

      //Check that users has earned 
      expect(await daiContract.balanceOf(userWithArgencoinsA.address)).to.be.eq(ethers.utils.parseUnits("9"));    
    });

    it('stake two users', async () => {
      //Reward 10 dai in the next 1000 seconds
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("10"), 1000);

      //User A stake after 100 seconds
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 100);
      await stakingContract.connect(userWithArgencoinsA).stake(ethers.utils.parseUnits("10"));

      //User B stake after 500 seconds since the beginning of reward
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 400);
      await stakingContract.connect(userWithArgencoinsB).stake(ethers.utils.parseUnits("30"));

      //Collect rewards after all has ended
      await time.setNextBlockTimestamp((await ethers.provider.getBlock("latest")).timestamp + 5000);
      await stakingContract.connect(userWithArgencoinsA).collectReward();
      await stakingContract.connect(userWithArgencoinsB).collectReward();

      //Check that users has earned 
      expect(await daiContract.balanceOf(userWithArgencoinsA.address)).to.be.eq(ethers.utils.parseUnits("5.25"));
      expect(await daiContract.balanceOf(userWithArgencoinsB.address)).to.be.eq(ethers.utils.parseUnits("3.75"));
    });
  });

  describe('setNextReward', () => {
    it('raise an error if is trying to set it but previous set was not done yet', async() => {
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("2"), 3600);

      await expect(stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("2"), 3600)).to.be.revertedWith('Previous reward has not finished yet');
    })

    it('raise an error if reward rate is 0', async () => {
      await expect(stakingContract.connect(stakingOwner).setNextReward(100, 3600)).to.be.revertedWith('Reward rate must be greater than 0');
    });

    it('raise an error if staking has not enough funds to reward', async () => {
      await expect(stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("1000"), 3600)).to.be.revertedWith('Not enough funds in staking to give that amount of reward');
    });

    it('set for first time', async () => {
      //Execute
      await stakingContract.connect(stakingOwner).setNextReward(ethers.utils.parseUnits("5"), 3600);

      //Asserts
      expect(await stakingContract.rewardRate()).to.be.eq(ethers.utils.parseUnits("5").div(3600));

      const latestBlock = await ethers.provider.getBlock("latest");
      expect(await stakingContract.finishAt()).to.be.eq(latestBlock.timestamp + 3600);
      expect(await stakingContract.updatedAt()).to.be.eq(latestBlock.timestamp || 0);
    });
  });
})
