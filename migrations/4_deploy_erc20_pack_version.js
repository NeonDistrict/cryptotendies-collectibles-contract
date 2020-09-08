const TestERC20 = artifacts.require("TestERC20");
const TendiesBox = artifacts.require("TendiesBox");
const TendiesBoxWithERC20 = artifacts.require("TendiesBoxWithERC20");
const config = require('../lib/configV1.js');

module.exports = async function(deployer, network, accounts) {
  let erc20, withdrawAddress, perPackAmount;
  if (network.indexOf('rinkeby') !== -1) {
    erc20 = '';
    withdrawAddress = "0x56d76411919Ab8F86D0972b24a9986943193b306";
    perPackAmount = web3.utils.toWei("0.01", "ether");
  } else if (network.indexOf('mainnet') !== -1) {
    erc20 = '';
    withdrawAddress = "0x56d76411919Ab8F86D0972b24a9986943193b306";
    perPackAmount = web3.utils.toWei("0.01", "ether");
  } else {
    // Deploy a fake
    await deployer.deploy(TestERC20, "Coin Artist Test", "$COINTEST");
    erc20 = (await TestERC20.deployed()).address;
    withdrawAddress = accounts[accounts.length-1];
    perPackAmount = web3.utils.toWei("0.01", "ether");
  }

  let tendiesBox = (await TendiesBox.deployed()).address;

  console.log("Deploying TendiesBoxWithERC20");
  await deployer.deploy(TendiesBoxWithERC20, tendiesBox, erc20, withdrawAddress, perPackAmount);
};
