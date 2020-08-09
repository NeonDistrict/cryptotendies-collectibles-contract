const truffleAssert = require('truffle-assertions');

const TendiesBox = artifacts.require("../contracts/TendiesBox.sol");
const TendiesWrapper = artifacts.require("../contracts/TendiesWrapper.sol");
const TendToken = artifacts.require("../contracts/tend/TendToken.sol");

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("TendiesWrapper", (accounts) => {
  let instance,
    tendTokenInstance,
    tendiesBoxInstance;

  const owner = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];
  const uniswapPool = accounts[accounts.length-1];

  before(async () => {
    instance = await TendiesWrapper.deployed();
    tendTokenInstance = await TendToken.deployed();
    tendiesBoxInstance = await TendiesBox.deployed();
  });

  describe('grillPool Proxy', () => {
    it('drain tokens from fake uniswap pool account in overriden TendToken contract',
      async () => {
        let balanceInitial = await tendTokenInstance.balanceOf(uniswapPool);
        assert.isOk(balanceInitial.gt(0));

        await tendTokenInstance.drainUniswapPool({from: owner});

        let balanceFinal = await tendTokenInstance.balanceOf(uniswapPool);
        assert.equal(0, balanceFinal.toNumber());
      });

    it('should fail to call grillPool because not enough tokens in the pool',
      async () => {
        truffleAssert.fails(
          instance.grillPool({ from: userA }),
          truffleAssert.ErrorType.revert,
          'grillPool: min grill amount not reached.'
        );
      });

    it('add tokens to fake uniswap pool account in overriden TendToken contract',
      async () => {
        let balanceInitial = await tendTokenInstance.balanceOf(uniswapPool);
        assert.equal(0, balanceInitial.toNumber());

        await tendTokenInstance.addToUniswapPool({from: owner});

        let balanceFinal = await tendTokenInstance.balanceOf(uniswapPool);
        assert.isOk(web3.utils.toWei("100000000", 'ether'), balanceFinal.toString());
      });

    it('check getGrillAmount greater than zero',
      async () => {
        let grillAmount = await tendTokenInstance.getGrillAmount();
        assert.isOk(grillAmount.gt(0));
      });

    it('should allow userA to call grillPool from original TendToken, does not mint a box',
      async () => {
        let balanceInitial = await tendTokenInstance.balanceOf(userA);
        assert.equal(0, balanceInitial.toNumber());

        await tendTokenInstance.grillPool({from: userA});

        let balanceFinal = await tendTokenInstance.balanceOf(userA);
        assert.isOk(balanceFinal.gt(0));

        let grillPoolDropBoxId = 1;

        let boxBalanceInitial = await tendiesBoxInstance.balanceOf(userA, grillPoolDropBoxId);
        assert.equal(0, boxBalanceInitial.toNumber());
      });

    it('call grillPool using wrapper, should mint a box to the user',
      async () => {
        await tendTokenInstance.addToUniswapPool({from: owner});

        let grillPoolDropBoxId = 1;

        let balanceInitial = await tendiesBoxInstance.balanceOf(userA, grillPoolDropBoxId);
        assert.equal(0, balanceInitial.toNumber());

        await instance.grillPool({from: userA});

        let balanceFinal = await tendiesBoxInstance.balanceOf(userA, grillPoolDropBoxId);
        assert.equal(1, balanceFinal.toNumber());
      });
  });

});
