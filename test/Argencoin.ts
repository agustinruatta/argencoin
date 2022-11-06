import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Argencoin", function () {
  async function deployArgencoinContract() {
    const [owner, minter] = await ethers.getSigners();

    const argencoinContract = await (await ethers.getContractFactory("Argencoin")).deploy(minter.getAddress());

    return { argencoinContract, owner, minter };
  }

  describe("Deployment", function () {
    it("Should deploy it", async function () {
      const { argencoinContract } = await loadFixture(deployArgencoinContract);

      expect(await argencoinContract.totalSupply()).to.equal(0);
    });

    it("Should set the right owner", async function () {
      const { argencoinContract, owner } = await loadFixture(deployArgencoinContract);

      expect(await argencoinContract.hasRole(await argencoinContract.DEFAULT_ADMIN_ROLE(), owner.getAddress())).to.equal(true);
    });

    it("Should set the right minter", async function () {
      const { argencoinContract, minter } = await loadFixture(deployArgencoinContract);

      expect(await argencoinContract.hasRole(await argencoinContract.MINTER_ROLE(), minter.getAddress())).to.equal(true);
    });
  });
});
