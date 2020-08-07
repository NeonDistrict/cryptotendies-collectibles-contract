const truffleAssert = require('truffle-assertions');
const vals = require('../lib/testValuesCommon.js');

const TestERC1155 = artifacts.require("../contracts/TestERC1155.sol");
const MockProxyRegistry = artifacts.require("../contracts/MockProxyRegistry.sol");

/* Useful aliases */
const toBN = web3.utils.toBN;

contract("BaseERC1155 via TestERC1155 - ERC 1155", (accounts) => {
  const NAME = 'ERC-1155 Test Contract';
  const SYMBOL = 'ERC1155Test';

  const INITIAL_TOKEN_ID = 1;
  const NON_EXISTENT_TOKEN_ID = 99999999;
  const MINT_AMOUNT = toBN(100);
  const MINT_TOKEN_ID = toBN(3);

  const OVERFLOW_NUMBER = toBN(2, 10).pow(toBN(256, 10)).sub(toBN(1, 10));

  let CREATOR_ROLE,
      MINTER_ROLE,
      CREATOR_ADMIN_ROLE,
      MINTER_ADMIN_ROLE;

  const owner = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];
  const proxyForOwner = accounts[3];
  const userCreator = accounts[4];
  const userMinter = accounts[5];
  const userCreatorAdmin = accounts[6];
  const userMinterAdmin = accounts[7];

  let instance;
  let proxy;

  // Keep track of token ids as we progress through the tests, rather than
  // hardcoding numbers that we will have to change if we add/move tests.
  // For example if test A assumes that it will create token ID 1 and test B
  // assumes that it will create token 2, changing test A later so that it
  // creates another token will break this as test B will now create token ID 3.
  // Doing this avoids this scenario.
  let tokenId = 0;

  // Because we need to deploy and use a mock ProxyRegistry, we deploy our own
  // instance of TestERC1155 instead of using the one that Truffle deployed.
  before(async () => {
    proxy = await MockProxyRegistry.new();
    await proxy.setProxy(owner, proxyForOwner);
    instance = await TestERC1155.new(NAME, SYMBOL, vals.URI_BASE, proxy.address);
  });

  describe('#constructor()', () => {
    it('should set the token name and symbol', async () => {
      const name = await instance.name();
      assert.equal(name, NAME);
      const symbol = await instance.symbol();
      assert.equal(symbol, SYMBOL);
    });
  });

  describe('#create()', () => {
    it('should allow the contract owner to create N token types with zero supply',
      async () => {
        let numTokensToCreate = 3;
        tokenId += numTokensToCreate;
        await instance.create(numTokensToCreate, { from: owner });
        let maxTokenID = await instance.maxTokenID();
        assert.equal(tokenId, maxTokenID.toNumber());
        const supply = await instance.totalSupply(tokenId);
        assert.ok(supply.eq(toBN(0)));
      });

    it('should increment the token type id',
      async () => {
        let numTokensToCreate = 2;
        tokenId += numTokensToCreate;
        await instance.create(numTokensToCreate, { from: owner });
        let maxTokenID = await instance.maxTokenID();
        assert.equal(tokenId, maxTokenID.toNumber());
      });

    it('should not allow a non-creator to create tokens',
       async () => {
         truffleAssert.fails(
           instance.create(1, { from: userA }),
           truffleAssert.ErrorType.revert,
           'Not a creator'
         );
       });
  });

  describe ('#uri()', () => {
    it('should return the uri for any token', async () => {
      const uriTokenId = 1;
      const uri = await instance.uri(uriTokenId);
      assert.equal(uri, vals.URI_BASE);
    });
  });

  describe('#setURI()', () => {
    let NEW_URI = "https://fakeurl.com/api/{id}";

    it('should allow the contract owner to set the URI',
      async () => {
        await instance.setURI(NEW_URI, { from: owner });
        let _uri = await instance.uri(1);
        assert.equal(NEW_URI, _uri);
      });

    it('should NOT allow a non-contract owner to set the URI',
      async () => {
        truffleAssert.fails(
          instance.setURI("https://someotherfakeurl.com/api/{id}", { from: userA }),
          truffleAssert.ErrorType.revert
        );
        let _uri = await instance.uri(1);
        assert.equal(NEW_URI, _uri);
      });
  });

  describe('#isApprovedForAll()', () => {
    it('should approve proxy address as _operator', async () => {
      assert.isOk(
        await instance.isApprovedForAll(owner, proxyForOwner)
      );
    });

    it('should not approve non-proxy address as _operator', async () => {
      assert.isNotOk(
        await instance.isApprovedForAll(owner, userB)
      );
    });

    it('should reject proxy as _operator for non-owner _owner', async () => {
      assert.isNotOk(
        await instance.isApprovedForAll(userA, proxyForOwner)
      );
    });

    it('should accept approved _operator for _owner', async () => {
      await instance.setApprovalForAll(userB, true, { from: userA });
      assert.isOk(await instance.isApprovedForAll(userA, userB));
      // Reset it here
      await instance.setApprovalForAll(userB, false, { from: userA });
    });

    it('should not accept non-approved _operator for _owner', async () => {
      await instance.setApprovalForAll(userB, false, { from: userA });
      assert.isNotOk(await instance.isApprovedForAll(userA, userB));
    });
  });

  describe('#setProxyRegistryAddress()', () => {
    it('should allow the contract owner to the proxy address',
      async () => {
        assert.isOk(
          await instance.setProxyRegistryAddress(proxy.address, { from: owner })
        );
      });

    it('should NOT allow a non-contract owner to set the proxy address',
      async () => {
        truffleAssert.fails(
          instance.setProxyRegistryAddress(proxy.address, { from: userA }),
          truffleAssert.ErrorType.revert
        );
      });
  });

  describe('#totalSupply()', () => {
    it('should return correct value for token supply',
      async () => {
        await instance.mint(userA, MINT_TOKEN_ID, MINT_AMOUNT, "0x0", { from: owner });
        const balance = await instance.balanceOf(userA, MINT_TOKEN_ID);
        assert.ok(balance.eq(MINT_AMOUNT));

        // Use the hand-crafted accessor
        const supplyAccessorValue = await instance.totalSupply(MINT_TOKEN_ID);
        assert.ok(supplyAccessorValue.eq(MINT_AMOUNT));
      });

    it('should return zero for non-existent token',
      async () => {
        const balanceValue = await instance.balanceOf(
          owner, NON_EXISTENT_TOKEN_ID
        );
        assert.ok(balanceValue.eq(toBN(0)));

        const supplyAccessorValue = await instance.totalSupply(
          NON_EXISTENT_TOKEN_ID
        );
        assert.ok(supplyAccessorValue.eq(toBN(0)));
      });
  });

  describe('#hasRole(), #grantRole(), #revokeRole()', () => {
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

    it('owner should have creator, minter, creator_admin, and minter_admin roles',
      async () => {
        assert.isOk(await instance.hasRole(CREATOR_ROLE, owner));
        assert.isOk(await instance.hasRole(MINTER_ROLE, owner));
        assert.isOk(await instance.hasRole(CREATOR_ADMIN_ROLE, owner));
        assert.isOk(await instance.hasRole(MINTER_ADMIN_ROLE, owner));
      });

    it('user should NOT have creator, minter, creator_admin, or minter_admin roles',
      async () => {
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, userA));
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userA));
        assert.isNotOk(await instance.hasRole(CREATOR_ADMIN_ROLE, userA));
        assert.isNotOk(await instance.hasRole(MINTER_ADMIN_ROLE, userA));
      });

    it('if NOT creator_admin, should NOT be able to add new creator',
      async () => {
        truffleAssert.fails(
          instance.grantRole(CREATOR_ROLE, userA, {from: userB}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, userA));
      });

    it('creator_admin should be able to add new creator',
       async () => {
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 1);
        await instance.grantRole(CREATOR_ROLE, userA, {from: owner});
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userA));
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 2);
       });

    it('authorized creator (not creator_admin) should NOT be able to add new creator',
      async () => {
        truffleAssert.fails(
          instance.grantRole(CREATOR_ROLE, userB, {from: userA}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userA));
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, userB));
      });

    it('authorized creator (not creator_admin) should NOT be able to add new minter',
      async () => {
        truffleAssert.fails(
          instance.grantRole(MINTER_ROLE, userB, {from: userA}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userA));
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userB));
      });

    it('if NOT minter_admin, should NOT be able to add new minter',
      async () => {
        truffleAssert.fails(
          instance.grantRole(MINTER_ROLE, userA, {from: userB}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userA));
      });

    it('minter_admin should be able to add new minter',
      async () => {
        await instance.grantRole(MINTER_ROLE, userA, {from: owner});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(MINTER_ROLE, userA));
      });

    it('authorized creator (not creator_admin) should NOT be able to revoke another creator',
      async () => {
        truffleAssert.fails(
          instance.revokeRole(CREATOR_ROLE, owner, {from: userA}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userA));
        assert.isOk(await instance.hasRole(CREATOR_ROLE, owner));
      });

    it('creator_admin should be able to revoke another creator',
      async () => {
        await instance.revokeRole(CREATOR_ROLE, userA, {from: owner});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 1);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, owner));
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, userA));
      });

    it('minter_admin should be able to revoke another minter',
      async () => {
        await instance.revokeRole(MINTER_ROLE, userA, {from: owner});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 1);
        assert.isOk(await instance.hasRole(MINTER_ROLE, owner));
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userA));
      });

    it('creator_admin should be able to add new creator_admin',
      async () => {
        await instance.grantAdmin(CREATOR_ADMIN_ROLE, userCreatorAdmin, {from: owner});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ADMIN_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(CREATOR_ADMIN_ROLE, owner));
        assert.isOk(await instance.hasRole(CREATOR_ADMIN_ROLE, userCreatorAdmin));
      });

    it('non-owner creator_admin should be able to revoke old owner creator_admin',
      async () => {
        await instance.revokeAdmin(CREATOR_ADMIN_ROLE, owner, {from: userCreatorAdmin});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ADMIN_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(CREATOR_ADMIN_ROLE, owner));
        assert.isOk(await instance.hasRole(CREATOR_ADMIN_ROLE, userCreatorAdmin));
      });

    it('if owner is NOT creator_admin, should NOT be able to add new creator_admin',
      async () => {
        truffleAssert.fails(
          instance.grantAdmin(CREATOR_ADMIN_ROLE, userB, {from: owner}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(CREATOR_ADMIN_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(CREATOR_ADMIN_ROLE, userB));
      });

    it('if owner is NOT creator_admin, should NOT be able to revoke creator_admin',
      async () => {
        truffleAssert.fails(
          instance.revokeAdmin(CREATOR_ADMIN_ROLE, userCreatorAdmin, {from: owner}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(CREATOR_ADMIN_ROLE)).toNumber(), 1);
        assert.isOk(await instance.hasRole(CREATOR_ADMIN_ROLE, userCreatorAdmin));
      });

    it('if owner is NOT creator_admin, should NOT be able to add new creator',
      async () => {
        truffleAssert.fails(
          instance.grantRole(CREATOR_ROLE, userB, {from: owner}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, userB));
      });

    it('non-owner creator_admin should be able to add new creator',
      async () => {
        await instance.grantRole(CREATOR_ROLE, userA, {from: userCreatorAdmin});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userA));
      });

    it('non-owner creator_admin should be able to revoke creators',
      async () => {
        await instance.revokeRole(CREATOR_ROLE, userA, {from: userCreatorAdmin});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, userA));

        await instance.revokeRole(CREATOR_ROLE, owner, {from: userCreatorAdmin});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 0);
        assert.isNotOk(await instance.hasRole(CREATOR_ROLE, owner));
      });

    it('minter_admin should be able to add new minter_admin',
      async () => {
        await instance.grantAdmin(MINTER_ADMIN_ROLE, userMinterAdmin, {from: owner});
        assert.equal((await instance.getRoleMemberCount(MINTER_ADMIN_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(MINTER_ADMIN_ROLE, owner));
        assert.isOk(await instance.hasRole(MINTER_ADMIN_ROLE, userMinterAdmin));
      });

    it('non-owner minter_admin should be able to revoke old owner minter_admin',
      async () => {
        await instance.revokeAdmin(MINTER_ADMIN_ROLE, owner, {from: userMinterAdmin});
        assert.equal((await instance.getRoleMemberCount(MINTER_ADMIN_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(MINTER_ADMIN_ROLE, owner));
        assert.isOk(await instance.hasRole(MINTER_ADMIN_ROLE, userMinterAdmin));
      });

    it('if owner is NOT minter_admin, should NOT be able to add new minter_admin',
      async () => {
        truffleAssert.fails(
          instance.grantAdmin(MINTER_ADMIN_ROLE, userB, {from: owner}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(MINTER_ADMIN_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(MINTER_ADMIN_ROLE, userB));
      });

    it('if owner is NOT minter_admin, should NOT be able to revoke minter_admin',
      async () => {
        truffleAssert.fails(
          instance.revokeAdmin(MINTER_ADMIN_ROLE, userMinterAdmin, {from: owner}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(MINTER_ADMIN_ROLE)).toNumber(), 1);
        assert.isOk(await instance.hasRole(MINTER_ADMIN_ROLE, userMinterAdmin));
      });

    it('if owner is NOT minter_admin, should NOT be able to add new minter',
      async () => {
        truffleAssert.fails(
          instance.grantRole(MINTER_ROLE, userB, {from: owner}),
          truffleAssert.ErrorType.revert
        );
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userB));
      });

    it('non-owner minter_admin should be able to add new minter',
      async () => {
        await instance.grantRole(MINTER_ROLE, userA, {from: userMinterAdmin});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 2);
        assert.isOk(await instance.hasRole(MINTER_ROLE, userA));
      });

    it('non-owner minter_admin should be able to revoke minters',
      async () => {
        await instance.revokeRole(MINTER_ROLE, userA, {from: userMinterAdmin});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 1);
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, userA));

        await instance.revokeRole(MINTER_ROLE, owner, {from: userMinterAdmin});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 0);
        assert.isNotOk(await instance.hasRole(MINTER_ROLE, owner));
      });

    it('creator_admin adds specified creator',
      async () => {
        await instance.grantRole(CREATOR_ROLE, userCreator, {from: userCreatorAdmin});
        assert.equal((await instance.getRoleMemberCount(CREATOR_ROLE)).toNumber(), 1);
        assert.isOk(await instance.hasRole(CREATOR_ROLE, userCreator));
      });

    it('minter_admin adds specified minter',
      async () => {
        await instance.grantRole(MINTER_ROLE, userMinter, {from: userMinterAdmin});
        assert.equal((await instance.getRoleMemberCount(MINTER_ROLE)).toNumber(), 1);
        assert.isOk(await instance.hasRole(MINTER_ROLE, userMinter));
      });

  });

  describe('#create() v2 with creators', () => {
    it('should allow a creator to create N token types with zero supply',
      async () => {
        let numTokensToCreate = 3;
        tokenId += numTokensToCreate;
        await instance.create(numTokensToCreate, { from: userCreator });
        let maxTokenID = await instance.maxTokenID();
        assert.equal(tokenId, maxTokenID.toNumber());
        const supply = await instance.totalSupply(tokenId);
        assert.ok(supply.eq(toBN(0)));
      });

    it('should not allow owner to create tokens if not a creator',
       async () => {
         truffleAssert.fails(
           instance.create(1, { from: owner }),
           truffleAssert.ErrorType.revert,
           'Not a creator'
         );
       });

    it('should not allow a non-creator to create tokens',
       async () => {
         truffleAssert.fails(
           instance.create(1, { from: userA }),
           truffleAssert.ErrorType.revert,
           'Not a creator'
         );
       });
  });

  describe('#mint()', () => {
    it('should allow minter to mint tokens',
      async () => {
        await instance.mint(
          userA, INITIAL_TOKEN_ID, MINT_AMOUNT, "0x0", { from: userMinter }
        );
        let supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT));
      });

    it('should not allow minter to mint tokens that don\'t yet exist',
      async () => {
        let reallyHighId = 10000000;
        truffleAssert.fails(
          instance.mint(userA, reallyHighId, MINT_AMOUNT, "0x0", { from: userMinter }),
          truffleAssert.ErrorType.revert
        );
      });

    it('should not allow owner to mint tokens if not minter',
      async () => {
        truffleAssert.fails(
          instance.mint(userA, INITIAL_TOKEN_ID, MINT_AMOUNT, "0x0", { from: owner }),
          truffleAssert.ErrorType.revert
        );
        let supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT));
      });

    it('should not allow regular user to mint tokens if not minter',
      async () => {
        truffleAssert.fails(
          instance.mint(userA, INITIAL_TOKEN_ID, MINT_AMOUNT, "0x0", { from: userB }),
          truffleAssert.ErrorType.revert
        );
        let supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT));
      });

    it('should not overflow token balances',
      async () => {
        const supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT));
        await truffleAssert.fails(
          instance.mint(userB, INITIAL_TOKEN_ID, OVERFLOW_NUMBER, "0x0", {from: userMinter }),
          truffleAssert.ErrorType.revert,
          'SafeMath: addition overflow'
        );
      });
  });

  describe('#batchMint()', () => {
    it('should allow minter to batch mint tokens',
      async () => {
        await instance.mintBatch(
          userA, [INITIAL_TOKEN_ID], [MINT_AMOUNT], "0x0", { from: userMinter }
        );
        let supply = await instance.totalSupply(INITIAL_TOKEN_ID);

        // It's doubled now
        assert.isOk(supply.eq(MINT_AMOUNT.add(MINT_AMOUNT)));
      });

    it('should not allow owner to batch mint tokens if not minter',
      async () => {
        truffleAssert.fails(
          instance.mintBatch(userA, [INITIAL_TOKEN_ID], [MINT_AMOUNT], "0x0", { from: owner }),
          truffleAssert.ErrorType.revert
        );
        let supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT.add(MINT_AMOUNT)));
      });

    it('should not allow regular user to batch mint tokens if not minter',
      async () => {
        truffleAssert.fails(
          instance.mintBatch(userA, [INITIAL_TOKEN_ID], [MINT_AMOUNT], "0x0", { from: userB }),
          truffleAssert.ErrorType.revert
        );
        let supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT.add(MINT_AMOUNT)));
      });

    it('should not overflow token balances',
      async () => {
        const supply = await instance.totalSupply(INITIAL_TOKEN_ID);
        assert.isOk(supply.eq(MINT_AMOUNT.add(MINT_AMOUNT)));
        await truffleAssert.fails(
          instance.mintBatch(userB, [INITIAL_TOKEN_ID], [OVERFLOW_NUMBER], "0x0", {from: userMinter }),
          truffleAssert.ErrorType.revert,
          'SafeMath: addition overflow'
        );
      });
  });

});
