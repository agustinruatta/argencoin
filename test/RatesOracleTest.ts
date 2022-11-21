import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RatesOracle } from '../typechain-types';

describe('RatesOracle', async function () {
  const [owner, strange] = await ethers.getSigners();

  let ratesOracleContract: RatesOracle;

  beforeEach(async () => {
    async function deployRatesOracleContract() {
      return await (await ethers.getContractFactory('RatesOracle')).deploy();
    }

    ratesOracleContract = await loadFixture(deployRatesOracleContract);
  })

  describe('Deployment', () => {
    it('Should deploy it', async () =>  {
      expect(ratesOracleContract).to.not.null;
    });

    it('Should set the right owner', async () =>  {
      expect(await ratesOracleContract.owner()).to.equal(owner.address);
    });
  });

  describe('setArgencoinRate', () => {
    it('raise en error if caller is not the owner', async () => {
        await expect(ratesOracleContract.connect(strange).setArgencoinRate('dai', ethers.utils.parseUnits('100'))).to.be.revertedWith('Ownable: caller is not the owner');
    })

    it('sets a rate', async () => {
        await ratesOracleContract.connect(owner).setArgencoinRate('dai', ethers.utils.parseUnits('100'));

        expect(await ratesOracleContract.getArgencoinRate('dai')).to.be.eq(ethers.utils.parseUnits('100'));
    });
  });

  describe('getArgencoinRate', () => {
    it('raise an error if rate is not set', async () => {
        await expect(ratesOracleContract.connect(strange).getArgencoinRate('dai')).to.be.revertedWith('No rate available');
    });
  });
});
