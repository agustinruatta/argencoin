import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Testcoin', function () {
    async function configFixtures() {
        const [owner, minter, strange] = await ethers.getSigners();

        const testcoinContract = await (await ethers.getContractFactory('Testcoin')).deploy();
        testcoinContract.grantRole(await testcoinContract.MINTER_ROLE(), minter.address)

        return { testcoinContract: testcoinContract, owner, minter, strange };
    }

    function deployTestcoinContract() {
        return loadFixture(configFixtures);
    }

    describe('Deployment', function () {
        it('Should deploy it', async () =>  {
            const { testcoinContract } = await deployTestcoinContract();

            expect(await testcoinContract.totalSupply()).to.equal(0);
        });

        it('should set the right owner', async () =>  {
            const { testcoinContract, owner } = await deployTestcoinContract();

            expect(await testcoinContract.hasRole(await testcoinContract.DEFAULT_ADMIN_ROLE(), owner.getAddress())).to.equal(true);
        });

        it('Should set the right minter', async () =>  {
            const { testcoinContract, minter } = await deployTestcoinContract();

            expect(await testcoinContract.hasRole(await testcoinContract.MINTER_ROLE(), minter.getAddress())).to.equal(true);
        });
    });

    describe('mint', () => {
        it('Should raise an error if caller is not the minter', async () => {
            const { testcoinContract, strange } = await deployTestcoinContract();

            await expect(testcoinContract.connect(strange).mint(strange.getAddress(), 1)).to.be
                .revertedWith(`AccessControl: account ${(await strange.getAddress()).toLocaleLowerCase()} is missing role ${await testcoinContract.MINTER_ROLE()}`);
        })

        it('Should mint if caller is the minter', async () => {
            let { testcoinContract, minter, strange } = await deployTestcoinContract();
            testcoinContract = testcoinContract.connect(minter);

            expect(await testcoinContract.totalSupply()).to.equal(0);

            testcoinContract.mint(strange.getAddress(), 100);

            expect(await testcoinContract.totalSupply()).to.equal(100);
            expect(await testcoinContract.balanceOf(strange.getAddress())).to.equal(100);
        })
    });
});
