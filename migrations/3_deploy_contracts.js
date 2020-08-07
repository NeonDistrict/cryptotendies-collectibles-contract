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
    .then(setupCardsAndPacks.bind(this, network));
};

async function setupCardsAndPacks(network) {
  const boxes = await TendiesBox.deployed();
  const collectible = await TendiesCard.deployed();

  // Grant the TendiesBox permission to mint TendiesCards
  const MINTER_ROLE = await collectible.MINTER_ROLE();
  await collectible.grantRole(MINTER_ROLE, TendiesBox.address);

  if (network === 'rinkeby') {
    // Grant test minter -- MINTER_ROLE is the same keccak in both contracts
    await boxes.grantRole(MINTER_ROLE, '0x636c54bA584fC0e81F772c27c44CDbE773b18313');
  }

  // Set up all of the tokens
  await collectible.create(config.TOKEN_COUNTS, config.CLASS_IDS);

  // Now set up the packs
  for (let boxIdx = 0; boxIdx < config.BOXES.length; boxIdx++) {
    await boxes.create(
      config.BOXES[boxIdx].NUM_CARDS,
      config.BOXES[boxIdx].CLASS_IDS,
      config.BOXES[boxIdx].CLASS_PROBABILITIES,
      config.BOXES[boxIdx].GUARANTEED_CLASS_IDS
    );
  }
}
