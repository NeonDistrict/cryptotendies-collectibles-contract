const TendToken = artifacts.require("TendToken");

module.exports = function(deployer, network) {
  if (network === 'development' || network === 'rinkeby') {
    deployer.deploy(TendToken, 100)
      .then((inst) => {
        return inst.unpause();
      });
  }
};
