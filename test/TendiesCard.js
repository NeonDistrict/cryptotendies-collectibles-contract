const TendiesCard = artifacts.require("../contracts/TendiesCard.sol");

const config = require('../lib/configV1.js');

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("TendiesCard", (accounts) => {
  let instance;

  const INITIAL_CARD_SET_SIZE = config.TOKEN_COUNTS.reduce((a, b) => a + b, 0);
  let tokenId = 0;

  let CREATOR_ROLE,
      MINTER_ROLE,
      CREATOR_ADMIN_ROLE,
      MINTER_ADMIN_ROLE;

  const owner = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];
  const userCreator = accounts[3];
  const userMinter = accounts[4];

  before(async () => {
    instance = await TendiesCard.deployed();
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
    it.skip('creator should be able to define the initial set of cards for v1', async () => {
      tokenId += INITIAL_CARD_SET_SIZE;

      await instance.create(config.CLASS_IDS, config.TOKEN_COUNTS, { from: userCreator });

      let maxTokenID = await instance.maxTokenID();
      assert.equal(tokenId, maxTokenID.toNumber());

      const supply = await instance.totalSupply(tokenId);
      assert.ok(supply.eq(toBN(0)));
    });

    it('verify the maxTokenID matches expected amount', async () => {
      let maxTokenID = await instance.maxTokenID();
      assert.equal(INITIAL_CARD_SET_SIZE, maxTokenID.toNumber());
    });

    it('verify the initial set of cards, class 0', async () => {
      let classIndex = 0;
      let classTokenCounts = await instance.classTokenCounts(config.CLASS_IDS[classIndex]);
      assert.equal(config.TOKEN_COUNTS[classIndex], classTokenCounts.toNumber());
    });
  });

  describe('#uri()', () => {
    it('should get the correct URI to the supplied value', async () => {
      let maxTokenID = await instance.maxTokenID();
      assert.equal(await instance.uri(1), "https://metadata.tendies.dev/api/card/1");
    });
  });

  describe('#mint()', () => {
    it('minter should be able to mint one of the initial cards at random', async () => {
      let randTokenId = Math.floor(Math.random() * INITIAL_CARD_SET_SIZE);
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
    it('owner of a card should be able to transfer one to another user', async () => {
      let randTokenId = Math.floor(Math.random() * INITIAL_CARD_SET_SIZE);
      let randMintAmount = Math.floor(Math.random() * 100);

      const supplyInitial = await instance.totalSupply(randTokenId);

      await instance.mint(userA, randTokenId, randMintAmount, "0x0", { from: userMinter });

      let balance = await instance.balanceOf(userA, randTokenId);
      assert.ok(balance.eq(toBN(randMintAmount)));

      let supply = await instance.totalSupply(randTokenId);
      assert.ok(supply.eq(supplyInitial.add(toBN(randMintAmount))));

      await instance.safeTransferFrom(userA, userB, randTokenId, 1, "0x0", { from: userA });

      balance = await instance.balanceOf(userA, randTokenId);
      assert.ok(balance.eq(toBN(randMintAmount - 1)));

      balance = await instance.balanceOf(userB, randTokenId);
      assert.ok(balance.eq(toBN(1)));

      supply = await instance.totalSupply(randTokenId);
      assert.ok(supply.eq(supplyInitial.add(toBN(randMintAmount))));
    });
  });
});
