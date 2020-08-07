// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

//import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BaseERC1155.sol";
import "./TendiesCard.sol";

/**
 * @title TendiesBox
 * TendiesBox - a contract for semi-fungible tokens
 */
contract TendiesBox is BaseERC1155
{
  using SafeMath for uint256;

  // Must be sorted by rarity
  struct BoxConfig {
    uint16 maxQuantityPerOpen;
    uint16[] classProbabilities; // Out of the basis points, in descending order
    uint16[] classIds;
    uint16[] guaranteedClassIds;
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
      "https://metadata.tendies.dev/api/box/{id}",
      _proxyRegistryAddress
    )
    public
  {
    nftContract = TendiesCard(_nftAddress);
  }


/**
 * Only Token Creator Functions
 **/

  // Intentionally virtual to allow for extensions on the terms of creating tokens
  function create(
    uint16 _maxQuantityPerOpen,
    uint16[] memory _classIds,
    uint16[] memory _classProbabilities,
    uint16[] memory _guaranteedClassIds
  )
    external
  {
    require(hasRole(CREATOR_ROLE, _msgSender()), "Not a creator");
    require(_maxQuantityPerOpen > 0, "Packs must produce at least one card");
    require(_guaranteedClassIds.length <= _maxQuantityPerOpen, "Too many guaranteed classes");

    for (uint256 guarIdx = 0; guarIdx < _guaranteedClassIds.length; guarIdx++) {
      bool found = false;
      for (uint256 classIdx = 0; classIdx < _classIds.length; classIdx++) {
        if (_guaranteedClassIds[guarIdx] == _classIds[classIdx]) {
          found = true;
          break;
        }
      }

      require(found, "Invalid guaranteed class ID");
    }

    // Keep track of the latest ID
    maxTokenID = maxTokenID.add(1);

    // Add the pack config
    boxConfigs[maxTokenID] = BoxConfig({
      maxQuantityPerOpen: _maxQuantityPerOpen,
      classProbabilities: _classProbabilities,
      classIds: _classIds,
      guaranteedClassIds: _guaranteedClassIds
    });
  }

  // Open a pack
  function open(
    uint256 _boxId,
    uint256 _amount
  )
    external
  {
    // We do *not* perform operator validation here
    // because opening a pack can only be done by the sender

    // Burn the boxes, decrease total supply
    _burn(_msgSender(), _boxId, _amount);
    totalSupply[_boxId] = totalSupply[_boxId].sub(_amount);

    // If we make it here, we're minting tendies

    // Load settings for this box option
    BoxConfig memory settings = boxConfigs[_boxId];

    // Iterate over the quantity of boxes specified
    for (uint256 boxIdx = 0; boxIdx < _amount; boxIdx++) {
      uint256 arrIndex = 0;
      uint256[] memory tokenIdsToMint = new uint256[](settings.maxQuantityPerOpen);
      uint256[] memory quantitiesToMint = new uint256[](settings.maxQuantityPerOpen);

      // Process guaranteed token ids
      for (uint256 classIdx = 0; classIdx < settings.guaranteedClassIds.length; classIdx++) {
        uint256 classId = settings.guaranteedClassIds[classIdx];

        // Don't try to access elements that don't exist
        if (arrIndex < settings.maxQuantityPerOpen) {
          tokenIdsToMint[arrIndex] = _pickRandomAvailableTokenIdForClass(classId);
          quantitiesToMint[arrIndex] = 1;
          arrIndex++;
        }
      }

      // Process non-guaranteed ids
      while (arrIndex < settings.maxQuantityPerOpen) {
        // Keep track of token IDs we're minting and their quantities
        uint256 class = _pickRandomClass(settings.classProbabilities, settings.classIds);
        tokenIdsToMint[arrIndex] = _pickRandomAvailableTokenIdForClass(class);
        quantitiesToMint[arrIndex] = 1;
        arrIndex++;
      }

      // Mint all of the tokens
      nftContract.mintBatch(_msgSender(), tokenIdsToMint, quantitiesToMint, "");
    }
  }


  /////
  // HELPER FUNCTIONS
  /////

  function _pickRandomClass(
    uint16[] memory _classProbabilities,
    uint16[] memory _classIds
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
        return _classIds[idx];
      } else {
        value = value - probability;
      }
    }

    return _classIds[0];
  }


  function _pickRandomAvailableTokenIdForClass(
    uint256 _classId
  )
    internal
    returns (uint256)
  {
    uint256 classTokenCount = nftContract.classTokenCounts(_classId);

    if (classTokenCount == 0) {
      return 0;
    }

    uint256 randIndex = _random().mod(classTokenCount);
    return nftContract.classToTokenIds(_classId, randIndex);
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
