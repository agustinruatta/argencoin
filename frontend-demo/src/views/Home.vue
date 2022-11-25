<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png">
    <h1>Argencoin</h1>
    <h2>Config</h2>

    <label>
      Network:
      <input id="network-input" type="text">
    </label>
    <br>

    <label>
      CentralBank address:
      <input id="central-bank-address-input" type="text">
    </label>
    <br>

    <label>
      Argencoin address:
      <input id="argencoin-address-input" type="text">
    </label>
    <br>

    <label>
      RatesOracle address:
      <input id="rates-oracle-address-input" type="text">
    </label>
    <br>

    <label>
      Dai address:
      <input id="dai-address-input" type="text">
    </label>
    <br>

    <label>
      Staking address:
      <input id="staking-address-input" type="text">
    </label>
    <br>

    <h2>Mint Argencoin</h2>
  </div>
</template>

<script>
export default {
  name: 'Home',
};
</script>
