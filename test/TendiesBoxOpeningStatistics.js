const truffleAssert = require('truffle-assertions');

const TendiesBox = artifacts.require("../contracts/TendiesBox.sol");
const TendiesCard = artifacts.require("../contracts/TendiesCard.sol");

const config = require('../lib/configV1.js');

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("TendiesBox Opening Statistics", (accounts) => {
  let instance,
    tendiesCardInstance;

  let cardLog = [];

  let boxTokenId = 3;
  let boxTokenAmount = 20;

  let MINTER_ROLE;

  const owner = accounts[0];
  const userA = accounts[1];
  const userMinter = accounts[2];

  before(async () => {
    instance = await TendiesBox.deployed();
    tendiesCardInstance = await TendiesCard.deployed();
  });

  after(async () => {
    let tokenCounts = config.TOKEN_COUNTS;
    let bins = [0,0,0,0,0];
    for (let idx = 0; idx < cardLog.length; idx++) {
      let binIdx = 0;
      let localTokenMaxIdx = 0;
      let localTokenMax = tokenCounts[localTokenMaxIdx];
      while (cardLog[idx] > localTokenMax && localTokenMaxIdx < tokenCounts.length) {
        binIdx++;
        localTokenMax += tokenCounts[++localTokenMaxIdx];
      }
      bins[binIdx]++;
    }
    console.log(bins);
    console.log(bins.map((a) => a / cardLog.length));
  });


  /**
   * Box-specific
   **/

  describe('Access Controls', () => {
    it('TendiesCard should grant TendiesBox minting permission',
      async () => {
        CARD_MINTER_ROLE = await tendiesCardInstance.MINTER_ROLE();
        assert.isOk(CARD_MINTER_ROLE);

        await tendiesCardInstance.grantRole(CARD_MINTER_ROLE, instance.address, {from: owner});
        assert.isOk(await tendiesCardInstance.hasRole(CARD_MINTER_ROLE, owner));
        assert.isOk(await tendiesCardInstance.hasRole(CARD_MINTER_ROLE, instance.address));
      });

    it('TendiesBox should grant userMinter minting permission',
      async () => {
        CARD_MINTER_ROLE = await instance.MINTER_ROLE();
        assert.isOk(CARD_MINTER_ROLE);

        await instance.grantRole(CARD_MINTER_ROLE, userMinter, {from: owner});
        assert.isOk(await instance.hasRole(CARD_MINTER_ROLE, owner));
        assert.isOk(await instance.hasRole(CARD_MINTER_ROLE, userMinter));
      });
  });

  describe('#open()', () => {
    it('send some boxes of type 3 (TESTING) to the user to open',
      async () => {
        let boxBalanceInitial = await instance.balanceOf(userA, boxTokenId);

        await instance.mint(userA, boxTokenId, boxTokenAmount, "0x0", { from: userMinter });

        // Verify that number of boxes increased
        let balance = await instance.balanceOf(userA, boxTokenId);
        assert.ok(balance.eq(boxBalanceInitial.add(toBN(boxTokenAmount))));
      });

    async function openBoxes(_user, boxTokenId, boxTokenAmount) {
      let boxBalanceInitial = await instance.balanceOf(_user, boxTokenId);

      let tx = await instance.open(boxTokenId, boxTokenAmount, { from: _user });
      let logs = tx.logs;

      for (let idx = 0; idx < logs.length; idx++) {
        if (logs[idx].event === 'TransferBatch') {
          for (let cardIdx = 0; cardIdx < logs[idx].args.ids.length; cardIdx++) {
            cardLog.push(logs[idx].args.ids[cardIdx].toNumber());
          }
        }
      }

      assert.ok(true);
    }

    it('open all packs...',
      async () => {
        let openPackAmount = 4;

        for (let idx = 0; idx < boxTokenAmount / openPackAmount; idx++) {
          console.log(`Opening Box #${idx}`);
          await openBoxes(userA, boxTokenId, openPackAmount);
        }
      });

  });

});
