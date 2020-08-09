const TendToken = artifacts.require("TendToken");

module.exports = function(deployer, network, accounts) {
  if (network.indexOf('mainnet') === -1) {
    deployer.deploy(TendToken, 100)
      .then((inst) => {
        instance = inst;
        return instance.unpause();
      })
      .then(() => {
        return instance.overrideUniswapPool(accounts[accounts.length-1]);
      })
      .then(() => {
        return instance.addToUniswapPool();
      });
  }
};
