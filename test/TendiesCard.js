const TendiesCard = artifacts.require("../contracts/TendiesCard.sol");

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("TendiesCard", (accounts) => {
  let instance;

  const INITIAL_CARD_SET_SIZE = 150;
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
        await instance.grantRole(CREATOR_ROLE, userCreator, {from: owner});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userCreator));
      });

    it('owner should be able to add new minter',
      async () => {
        await instance.grantRole(MINTER_ROLE, userMinter, {from: owner});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(MINTER_ROLE, userMinter));
      });
  });

  describe('#create()', () => {
    it('creator should be able to define the initial set of cards for v1', async () => {
      tokenId += INITIAL_CARD_SET_SIZE;

      await instance.create(INITIAL_CARD_SET_SIZE, { from: userCreator });

      let maxTokenID = await instance.maxTokenID();
      assert.equal(tokenId, maxTokenID.toNumber());

      const supply = await instance.totalSupply(tokenId);
      assert.ok(supply.eq(toBN(0)));
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
});
