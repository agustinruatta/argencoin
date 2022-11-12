import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Argencoin', function () {
  async function configFixtures() {
    const [owner, minter, strange] = await ethers.getSigners();

    const argencoinContract = await (await ethers.getContractFactory('Argencoin')).deploy();
    argencoinContract.grantRole(await argencoinContract.MINTER_ROLE(), await minter.getAddress())

    return { argencoinContract, owner, minter, strange };
  }

  function deployArgencoinContract() {
    return loadFixture(configFixtures);
  }

  describe('Deployment', function () {
    it('Should deploy it', async () =>  {
      const { argencoinContract } = await deployArgencoinContract();

      expect(await argencoinContract.totalSupply()).to.equal(0);
    });

    it('Should set the right owner', async () =>  {
      const { argencoinContract, owner } = await deployArgencoinContract();

      expect(await argencoinContract.hasRole(await argencoinContract.DEFAULT_ADMIN_ROLE(), owner.getAddress())).to.equal(true);
    });

    it('Should set the right minter', async () =>  {
      const { argencoinContract, minter } = await deployArgencoinContract();

      expect(await argencoinContract.hasRole(await argencoinContract.MINTER_ROLE(), minter.getAddress())).to.equal(true);
    });
  });

  describe('mint', () => {
    it('Should raise an error if caller is not the minter', async () => {
      const { argencoinContract, strange } = await deployArgencoinContract();

      await expect(argencoinContract.connect(strange).mint(strange.getAddress(), 1)).to.be
        .revertedWith(`AccessControl: account ${(await strange.getAddress()).toLocaleLowerCase()} is missing role ${await argencoinContract.MINTER_ROLE()}`);
    })

    it('Should mint if caller is the minter', async () => {
      let { argencoinContract, minter, strange } = await deployArgencoinContract();
      argencoinContract = argencoinContract.connect(minter);

      expect(await argencoinContract.totalSupply()).to.equal(0);
      
      argencoinContract.mint(strange.getAddress(), 100);

      expect(await argencoinContract.totalSupply()).to.equal(100);
      expect(await argencoinContract.balanceOf(strange.getAddress())).to.equal(100);
    })
  });
});
