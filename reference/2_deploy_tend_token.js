const TendToken = artifacts.require("TendToken");

module.exports = function(deployer, network) {
  deployer.deploy(TendToken, 100, {gas: 5000000})
    .then((inst) => {
      console.log("Deployed TEND Token to address:", TendToken.address);

      inst.unpause().then((res) => {
        console.log("Unpaused TEND Token contract");
      });
    });
};