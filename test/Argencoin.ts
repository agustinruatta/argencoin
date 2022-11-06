import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Argencoin", function () {
  async function deployArgencoinContract() {
    const [owner, otherAccount] = await ethers.getSigners();

    const argencoinContract = await (await ethers.getContractFactory("Argencoin")).deploy();

    return { argencoinContract: argencoinContract, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy it", async function () {
      const { argencoinContract } = await loadFixture(deployArgencoinContract);

      expect(await argencoinContract.totalSupply()).to.equal(0);
    });

    it("Should set the right owner", async function () {
      const { argencoinContract, owner } = await loadFixture(deployArgencoinContract);

      expect(await argencoinContract.owner()).to.equal(owner.address);
    });
  });
});
