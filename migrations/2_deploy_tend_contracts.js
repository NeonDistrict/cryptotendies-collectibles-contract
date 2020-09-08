const TendToken = artifacts.require("TendToken");
const TendiesWrapper = artifacts.require("TendiesWrapper");

module.exports = function(deployer, network, accounts) {
  if (network.indexOf('mainnet') === -1) {
    let instance;
    deployer.deploy(TendToken, 9000000)
      .then((inst) => {
        instance = inst;
        console.log("Unpausing the TEND contract")
        return instance.unpause();
      })
      .then(() => {
        if (network.indexOf('development') === -1) {
          console.log("Setting the Uniswap pool")
          return instance.setUniswapPool();
        } else {
          console.log("Setting an arbitrary Uniswap pool")
          return instance.overrideUniswapPool(accounts[accounts.length-1]);
        }
      })
      .then(() => {
        console.log("Adding to the Uniswap pool")
        return instance.addToUniswapPool();
      })
      /*.then(() => {
        console.log("Deploying the Wrapper OVERRIDE")
        return deployer.deploy(TendiesWrapper, instance.address, "0x45F7AD3B6103175Ba9a6Ba56Ca3a1E5d9FC7Bc68", 1, 1);
      })
      .then(() => {
        process.exit();
      });*/
  }
};
