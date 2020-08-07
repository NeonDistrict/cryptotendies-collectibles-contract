// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BaseERC1155.sol";
import "./TendiesCard.sol";

/**
 * @title TendiesBox
 * TendiesBox - a contract for semi-fungible tokens
 */
contract TendiesBox is BaseERC1155, ReentrancyGuard
{
  using Strings for string;
  using SafeMath for uint256;

  // Must be sorted by rarity
  struct BoxConfig {
    uint16 maxQuantityPerOpen;
    uint16[] classProbabilities; // Out of the basis points, in descending order
    uint16[] classIds;
    //bool hasGuaranteedClasses;
    //uint16[NUM_CLASSES] guarantees;
  }

  mapping (uint256 => BoxConfig) public boxConfigs;

  // Information for random card pack pulls
  uint256 seed;
  uint256 constant INVERSE_BASIS_POINT = 10000;

  // NFT Contract
  TendiesCard public nftContract;


  constructor(
    address _nftAddress,
    address _proxyRegistryAddress
  )
    BaseERC1155(
      "Tendies Box",
      "TENDBOX",
      "https://metadata.tendies.dev/api/box/",
      _proxyRegistryAddress
    )
    public
  {
    nftContract = TendiesCard(_nftAddress);
  }


/**
 * Only Owner Functions
 **/

  function setNftAddress(
    address _nftAddress
  )
    external
    onlyOwner
  {
    require(_nftAddress != address(0), "Can't set zero address");
    nftContract = TendiesCard(_nftAddress);
  }


/**
 * Only Token Creator Functions
 **/

  // Intentionally virtual to allow for extensions on the terms of creating tokens
  function create(
    uint16 _maxQuantityPerOpen,
    uint16[] memory _classIds,
    uint16[] memory _classProbabilities//,
    //uint16[] memory _guarantees
  )
    external virtual
  {
    require(hasRole(CREATOR_ROLE, _msgSender()), "Not a creator");
    require(_maxQuantityPerOpen > 0, "Packs must produce at least one card");

    // Keep track of the latest ID
    maxTokenID = maxTokenID.add(1);

    // Add the pack config
    boxConfigs[maxTokenID] = BoxConfig({
      maxQuantityPerOpen: _maxQuantityPerOpen,
      classProbabilities: _classProbabilities,
      classIds: _classIds//,
      //hasGuaranteedClasses: hasGuaranteedClasses,
      //guarantees: _guarantees
    });
  }

  // Open a pack
  function open(
    uint256 _boxId,
    uint256 _amount
  )
    external
    nonReentrant
  {
    // Burn the packs
    burn(_msgSender(), _boxId, _amount);

    // If we make it here, we're minting tendies

    // Load settings for this box option
    BoxConfig memory settings = boxConfigs[_boxId];

    // Iterate over the quantity of boxes specified
    for (uint256 boxIdx = 0; boxIdx < _amount; boxIdx++) {
      uint256 quantitySent = 0;

      //uint256 arrIndex = 0;
      //uint256[] memory tokenIdsToMint = new uint256[](settings.maxQuantityPerOpen);
      //uint256[] memory quantitiesToMint = new uint256[](settings.maxQuantityPerOpen);

      /*
      // Iterate over the box's set quantity
      if (settings.hasGuaranteedClasses) {
        // Process guaranteed token ids
        for (uint256 classIdx = 0; classIdx < settings.guarantees.length; classIdx++) {
          if (classIdx > 0) {
            uint256 quantityOfGaranteed = settings.guarantees[classIdx];

            // Don't try to access elements that don't exist
            if (arrIndex < settings.maxQuantityPerOpen) {
              tokenIdsToMint[arrIndex] = _pickRandomAvailableTokenIdForClass(Class(classIdx));
              quantitiesToMint[arrIndex] = quantityOfGaranteed;
              arrIndex++;

              quantitySent += quantityOfGaranteed;
            }
          }
        }
      }
      */

      // Process non-guaranteed ids
      while (quantitySent < settings.maxQuantityPerOpen) {
        uint256 class = _pickRandomClass(settings.classProbabilities);

        // Keep track of token IDs we're minting and their quantities
        //if (arrIndex < settings.maxQuantityPerOpen) {
          /*
          tokenIdsToMint[arrIndex] = _pickRandomAvailableTokenIdForClass(class);
          quantitiesToMint[arrIndex] = 1;
          arrIndex++;
          */
          nftContract.mintRandomOfClass(_msgSender(), settings.classIds[class], 1);
          quantitySent += 1;
        //}
      }

      // Mint all of the tokens
      //nftContract.mintBatch(_toAddress, tokenIdsToMint, quantitiesToMint, "");
    }
  }


  /////
  // HELPER FUNCTIONS
  /////

  function _pickRandomClass(
    uint16[] memory _classProbabilities
  )
    internal
    returns (uint256)
  {
    uint16 value = uint16(_random().mod(INVERSE_BASIS_POINT));

    // Start at top class (length - 1)
    // skip common (0), we default to it
    for (uint256 idx = _classProbabilities.length - 1; idx > 0; idx--) {
      uint16 probability = _classProbabilities[idx];
      if (value < probability) {
        return idx;
      } else {
        value = value - probability;
      }
    }

    return 0;
  }

  function _random()
    internal
    returns (uint256)
  {
    uint256 randomNumber = uint256(
      keccak256(
        abi.encodePacked(
          blockhash(block.number - 1),
          msg.sender,
          seed
        )
      )
    );
    seed = randomNumber;
    return randomNumber;
  }


  function setSeed(
    uint256 _newSeed
  )
    public
    onlyOwner
  {
    seed = _newSeed;
  }

}
