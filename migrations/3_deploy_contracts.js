const TendiesCard = artifacts.require("TendiesCard");
const TendiesBox = artifacts.require("TendiesBox");
const TendiesWrapper = artifacts.require("TendiesWrapper");
const config = require('../lib/configV1.js');

module.exports = function(deployer, network) {
  // OpenSea proxy registry addresses for rinkeby and mainnet.
  let proxyRegistryAddress;
  if (network === 'rinkeby') {
    proxyRegistryAddress = "0xf57b2c51ded3a29e6891aba85459d600256cf317";
  } else {
    proxyRegistryAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
  }

  // Tendies contract
  if (network === 'development') {
    const TendToken = artifacts.require("TendToken");
    tendAddress = TendToken.address;
    console.log("Using developmet TendToken at address", tendAddress);
  } else if (network === 'rinkeby') {
    tendAddress = '0x1453Dbb8A29551ADe11D89825CA812e05317EAEB';
  } else if (network === 'mainnet') {
    tendAddress = '0x1453Dbb8A29551ADe11D89825CA812e05317EAEB';
  }

  console.log("Deploying TendiesCard");
  deployer.deploy(TendiesCard, proxyRegistryAddress)
    .then((instance) => {
      console.log("Deploying TendiesBox");
      return deployer.deploy(TendiesBox, instance.address, proxyRegistryAddress);
    })
    .then((instanceBox) => {
      console.log("Deploying TendiesWrapper");
      return deployer.deploy(TendiesWrapper, tendAddress, instanceBox.address, 1, 1);
    })
    .then(setupCardsAndPacks.bind(this, network));
};

async function setupCardsAndPacks(network) {
  const wrapper = await TendiesWrapper.deployed();
  const boxes = await TendiesBox.deployed();
  const collectible = await TendiesCard.deployed();

  // MINTER_ROLE is the same keccak in both contracts
  const MINTER_ROLE = await collectible.MINTER_ROLE();

  // Grant the TendiesBox permission to mint TendiesCards
  await collectible.grantRole(MINTER_ROLE, boxes.address);

  // Grant the TendiesWrapper permission to mint TendiesBox
  await boxes.grantRole(MINTER_ROLE, wrapper.address)

  if (network === 'rinkeby') {
    // Grant test minter on Rinkeby
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
