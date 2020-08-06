const TendiesCard = artifacts.require("../contracts/TendiesCard.sol");

contract("TendiesCard", (accounts) => {
  let tendiesCard;

  before(async () => {
    tendiesCard = await TendiesCard.deployed();
  });

  describe('#constructor()', () => {
    it('should set the URI to the supplied value', async () => {
      assert.equal(await tendiesCard.uri(1), "https://metadata.tendies.dev/api/card/1");
    });
  });
});
