<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png">
    <h1>Argencoin</h1>
    <h2>Config</h2>

    <label>
      Network:
      <input v-model="networkAddress" type="text">
    </label>
    <br>

    <label>
      CentralBank address:
      <input v-model="centralBankAddress" type="text">
    </label>
    <br>

    <label>
      Argencoin address:
      <input v-model="argencoinAddress" type="text">
    </label>
    <br>

    <label>
      RatesOracle address:
      <input v-model="ratesOracleAddress" type="text">
    </label>
    <br>

    <label>
      Dai address:
      <input v-model="daiAddress" type="text">
    </label>
    <br>

    <label>
      Staking address:
      <input v-model="stakingAddress" type="text">
    </label>
    <br>

    <h2>Mint Argencoin</h2>
    <div>
      <button @click="showCollateralBasicPoints">Show!</button>
    </div>
  </div>
</template>

<script>
/* eslint-disable */

import Web3 from 'web3';
import centralBankJson from '../../../artifacts/contracts/CentralBank.sol/CentralBank.json';

export default {
  name: 'Home',
  data() {
    return {
      blockchainNetwork: null,
      argencoinAddress: null,
      centralBankAddress: null,
      daiAddress: null,
      networkAddress: null,
      ratesOracleAddress: null,
      stakingAddress: null,
    };
  },
  methods: {
    web3() {
      return (new Web3(this.networkAddress));
    },
    showCollateralBasicPoints() {
      const eth = this.web3().eth;
      alert(JSON.stringify(centralBankJson));
      const centralBankContract = new eth.Contract(centralBankJson, this.centralBankAddress);

      centralBankContract.methods.getCollateralBasicPoints()
        .call((err, result) => { alert(result); });
    },
  },
};
</script>
