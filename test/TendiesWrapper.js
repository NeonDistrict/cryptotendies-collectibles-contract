const truffleAssert = require('truffle-assertions');

const TendiesWrapper = artifacts.require("../contracts/TendiesWrapper.sol");

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("TendiesWrapper", (accounts) => {
  let instance;

  const owner = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];

  before(async () => {
    instance = await TendiesWrapper.deployed();
  });

  describe('grillPool Proxy', () => {
    it('should fail to call grillPool because not enough tokens in the pool',
      async () => {
        truffleAssert.fails(
          instance.grillPool({ from: userA }),
          truffleAssert.ErrorType.revert,
          'grillPool: min grill amount not reached.'
        );
      });
  });

});
