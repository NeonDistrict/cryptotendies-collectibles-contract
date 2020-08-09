const truffleAssert = require('truffle-assertions');

const config = require('../lib/configV1.js');

const TendiesBox = artifacts.require("../contracts/TendiesBox.sol");
const TendiesCard = artifacts.require("../contracts/TendiesCard.sol");

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("TendiesBox", (accounts) => {
  let instance,
    tendiesCardInstance;

  const INITIAL_BOX_COUNT = 2;

  let cardPackLog = [];

  let CREATOR_ROLE,
      MINTER_ROLE,
      CREATOR_ADMIN_ROLE,
      MINTER_ADMIN_ROLE,
      CARD_MINTER_ROLE;

  const owner = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];
  const userCreator = accounts[3];
  const userMinter = accounts[4];

  before(async () => {
    instance = await TendiesBox.deployed();
    tendiesCardInstance = await TendiesCard.deployed();
  });

  after(async () => {
    console.log("Packs Opened:")
    console.log(cardPackLog);
    //await tendiesCardInstance.revokeRole(CARD_MINTER_ROLE, instance.address, {from: owner});
  });

  describe('Access Control: Add creator and minter roles', () => {
    it('should be able to get all roles',
      async () => {
        CREATOR_ROLE = await instance.CREATOR_ROLE();
        MINTER_ROLE = await instance.MINTER_ROLE();
        CREATOR_ADMIN_ROLE = await instance.CREATOR_ADMIN_ROLE();
        MINTER_ADMIN_ROLE = await instance.MINTER_ADMIN_ROLE();
        assert.isOk(CREATOR_ROLE);
        assert.isOk(MINTER_ROLE);
        assert.isOk(CREATOR_ADMIN_ROLE);
        assert.isOk(MINTER_ADMIN_ROLE);
      });

    it('owner should be able to add new creator',
      async () => {
        let creatorsInitial = (await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber();
        await instance.grantRole(CREATOR_ROLE, userCreator, {from: owner});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), creatorsInitial + 1);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userCreator));
      });

    it('owner should be able to add new minter',
      async () => {
        let mintersInitial = (await instance.getRoleMemberCount(MINTER_ROLE)).toNumber();
        await instance.grantRole(MINTER_ROLE, userMinter, {from: owner});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), mintersInitial + 1);
        assert.isOk(await instance.hasRole(MINTER_ROLE, userMinter));
      });
  });

  describe('#create()', () => {
    it('creator should be able to define a new valid pack types', async () => {
      let origMaxTokenID = await instance.maxTokenID();

      await instance.create(3, [0,1,2,3,4], [2000, 2000, 2000, 2000, 2000], [0, 1, 2], { from: userCreator });

      let maxTokenID = await instance.maxTokenID();
      assert.equal(origMaxTokenID.toNumber() + 1, maxTokenID.toNumber());

      const supply = await instance.totalSupply(maxTokenID);
      assert.ok(supply.eq(toBN(0)));
    });

    it('creator should not be able to set more guaranteed slots than available cards', async () => {
      let origMaxTokenID = await instance.maxTokenID();

      truffleAssert.fails(
          instance.create(2, [0,1,2,3,4], [2000, 2000, 2000, 2000, 2000], [0, 0, 0], { from: userCreator }),
          truffleAssert.ErrorType.revert,
          'Too many guaranteed classes'
        );

      let maxTokenID = await instance.maxTokenID();
      assert.equal(origMaxTokenID, maxTokenID.toNumber());
    });

    it('creator should not be able to set guaranteed slots for non-defined classes', async () => {
      let origMaxTokenID = await instance.maxTokenID();

      truffleAssert.fails(
          instance.create(4, [0,1,2,3,4], [2000, 2000, 2000, 2000, 2000], [5], { from: userCreator }),
          truffleAssert.ErrorType.revert,
          'Invalid guaranteed class ID'
        );

      let maxTokenID = await instance.maxTokenID();
      assert.equal(origMaxTokenID, maxTokenID.toNumber());
    });
  });

  describe('#uri()', () => {
    it('should get the default URI for any supplied value', async () => {
      let maxTokenID = await instance.maxTokenID();
      assert.equal(await instance.uri(1), config.BOX_API);
    });
  });

  describe('#mint()', () => {
    it('minter should be able to mint one of the initial boxes at random', async () => {
      let randTokenId = Math.floor(Math.random() * INITIAL_BOX_COUNT);
      let randMintAmount = Math.floor(Math.random() * 100);

      const supplyInitial = await instance.totalSupply(randTokenId);

      await instance.mint(userA, randTokenId, randMintAmount, "0x0", { from: userMinter });

      const balance = await instance.balanceOf(userA, randTokenId);
      assert.ok(balance.eq(toBN(randMintAmount)));

      const supply = await instance.totalSupply(randTokenId);
      assert.ok(supply.eq(supplyInitial.add(toBN(randMintAmount))));
    });
  });

  describe('#safeTransferFrom()', () => {
    it('owner of a box should be able to transfer one to another user', async () => {
      let randTokenId = Math.floor(Math.random() * INITIAL_BOX_COUNT);
      let randMintAmount = Math.floor(Math.random() * 100);

      const supplyInitial = await instance.totalSupply(randTokenId);
      const balanceInitial = await instance.balanceOf(userA, randTokenId);

      await instance.mint(userA, randTokenId, randMintAmount, "0x0", { from: userMinter });

      let balance = await instance.balanceOf(userA, randTokenId);
      assert.ok(balance.eq(balanceInitial.add(toBN(randMintAmount))));

      let supply = await instance.totalSupply(randTokenId);
      assert.ok(supply.eq(supplyInitial.add(toBN(randMintAmount))));

      await instance.safeTransferFrom(userA, userB, randTokenId, 1, "0x0", { from: userA });

      balance = await instance.balanceOf(userA, randTokenId);
      assert.ok(balance.eq(balanceInitial.add(toBN(randMintAmount - 1))));

      balance = await instance.balanceOf(userB, randTokenId);
      assert.ok(balance.eq(toBN(1)));

      supply = await instance.totalSupply(randTokenId);
      assert.ok(supply.eq(supplyInitial.add(toBN(randMintAmount))));
    });
  });


  /**
   * Box-specific
   **/

  describe('Access Control: TendiesCard should grant minter access to TendiesBox', () => {
    it('TendiesCard should grant TendiesBox minting permission',
      async () => {
        CARD_MINTER_ROLE = await tendiesCardInstance.MINTER_ROLE();
        assert.isOk(CARD_MINTER_ROLE);

        await tendiesCardInstance.grantRole(CARD_MINTER_ROLE, instance.address, {from: owner});
        assert.isOk(await tendiesCardInstance.hasRole(CARD_MINTER_ROLE, owner));
        assert.isOk(await tendiesCardInstance.hasRole(CARD_MINTER_ROLE, instance.address));
      });
  });

  describe('#open()', () => {
    it('send some boxes of type 1 to the user to open',
      async () => {
        let boxTokenId = 1;
        let boxTokenAmount = 10;

        let boxBalanceInitial = await instance.balanceOf(userA, boxTokenId);

        await instance.mint(userA, boxTokenId, boxTokenAmount, "0x0", { from: userMinter });

        // Verify that number of boxes increased
        let balance = await instance.balanceOf(userA, boxTokenId);
        assert.ok(balance.eq(boxBalanceInitial.add(toBN(boxTokenAmount))));
      });

    it('send some boxes of type 2 to the user to open',
      async () => {
        let boxTokenId = 2;
        let boxTokenAmount = 10;

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

      let pack = [];
      let countBatchTransfers = 0;
      for (let idx = 0; idx < logs.length; idx++) {
        if (logs[idx].event === 'TransferBatch') {
          countBatchTransfers++;

          pack.push(logs[idx].args.ids.map((a) => a.toNumber(0)));
        }
      }
      cardPackLog.push(pack);

      // Verify total number of batch transfers
      assert.equal(boxTokenAmount, countBatchTransfers);

      // Verify that number of boxes decreased
      balance = await instance.balanceOf(_user, boxTokenId);
      assert.ok(balance.eq(boxBalanceInitial.sub(toBN(boxTokenAmount))));
    }

    it('should be able to open a single TendiesBox type 1 and receive cards',
      async () => {
        let boxTokenId = 1;
        let boxTokenAmount = 1;

        await openBoxes(userA, boxTokenId, boxTokenAmount);
      });

    it('should be able to open multiple TendiesBox type 1 and receive cards',
      async () => {
        let boxTokenId = 1;
        let boxTokenAmount = 3;

        await openBoxes(userA, boxTokenId, boxTokenAmount);
      });

    it('should be able to open a single TendiesBox type 2 and receive cards',
      async () => {
        let boxTokenId = 2;
        let boxTokenAmount = 1;

        await openBoxes(userA, boxTokenId, boxTokenAmount);
      });

    it('should be able to open multiple TendiesBox type 2 and receive cards',
      async () => {
        let boxTokenId = 2;
        let boxTokenAmount = 3;

        await openBoxes(userA, boxTokenId, boxTokenAmount);
      });

    it('should not be able to open a box if you don\'t have cards',
      async () => {
        truffleAssert.fails(
          instance.open(1, 1, { from: userB }),
          truffleAssert.ErrorType.revert,
          'ERC1155: burn amount exceeds balance'
        );
      });

  });

});
