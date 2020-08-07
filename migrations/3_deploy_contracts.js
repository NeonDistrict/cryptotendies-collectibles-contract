const TendiesCard = artifacts.require("TendiesCard");
const TendiesBox = artifacts.require("TendiesBox");
const config = require('../lib/configV1.js');

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
    .then(setupCardsAndPacks);
};

async function setupCardsAndPacks() {
  const boxes = await TendiesBox.deployed();
  const collectible = await TendiesCard.deployed();

  // Grant the TendiesBox permission to mint TendiesCards
  const MINTER_ROLE = await collectible.MINTER_ROLE();
  await collectible.grantRole(MINTER_ROLE, TendiesBox.address);

  // Set up all of the tokens
  await collectible.create(config.TOKEN_COUNTS, config.CLASS_IDS);

  // Now set up the packs
  for (let boxIdx = 0; boxIdx < config.BOXES.length; boxIdx++) {
    await boxes.create(
      config.BOXES[boxIdx].NUM_CARDS,
      config.BOXES[boxIdx].CLASS_IDS,
      config.BOXES[boxIdx].CLASS_PROBABILITIES
    );
  }
}
