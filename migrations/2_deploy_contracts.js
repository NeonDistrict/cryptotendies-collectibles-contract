const TendiesCard = artifacts.require("TendiesCard");
const TendiesBox = artifacts.require("TendiesBox");

// If you want to set preminted token ids for specific classes
const TOKEN_ID_MAPPING = undefined; // { [key: number]: Array<[tokenId: string]> }

module.exports = function(deployer, network) {
  // OpenSea proxy registry addresses for rinkeby and mainnet.
  let proxyRegistryAddress;
  if (network === 'rinkeby') {
    proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
  } else {
    proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
  }

  console.log("Deploying TendiesCard");

  deployer.deploy(TendiesCard, proxyRegistryAddress)
    .then((instance) => {
      console.log("Deploying TendiesBox");
      return deployer.deploy(TendiesBox, instance.address, proxyRegistryAddress);
    })
    //.then(setupLootbox);
};

/*
async function setupLootbox() {
  // Transfer ownership of the collectibles to the lootbox
  const collectible = await TendiesCard.deployed();
  await collectible.transferOwnership(TendiesBox.address);

  // Define the token ID mapping
  if (TOKEN_ID_MAPPING) {
    const lootbox = await TendiesBox.deployed();
    for (const rarity in TOKEN_ID_MAPPING) {
      console.log(`Setting token ids for rarity ${rarity}`);
      const tokenIds = TOKEN_ID_MAPPING[rarity];
      await lootbox.setTokenIdsForClass(rarity, tokenIds);
    }
  }
}
*/