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

  // Event for logging lootbox opens
  event BoxOpened(
    uint256 indexed optionId,
    address indexed buyer,
    uint256 boxesPurchased,
    uint256 itemsMinted
  );

  // Must be sorted by rarity
  enum Class {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary
  }
  uint256 constant NUM_CLASSES = 5;

  struct OptionSettings {
    uint256 maxQuantityPerOpen;
    uint16[NUM_CLASSES] classProbabilities; // Out of the basis points, in descending order
    bool hasGuaranteedClasses;
    uint16[NUM_CLASSES] guarantees;
  }

  mapping (uint256 => OptionSettings) public optionToSettings;
  mapping (uint256 => uint256[]) public classToTokenIds;

  // Information for random card pack pulls
  uint256 seed;
  uint256 constant INVERSE_BASIS_POINT = 10000;

  // NFT Contract address
  address nftAddress;


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
    nftAddress = _nftAddress;
  }


  function setNftAddress(
    address _address
  )
    external
    onlyOwner
  {
    require(_address != address(0), "Can't set zero address");
    nftAddress = _address;
  }


  // Open a pack
  /*
  function open(
    uint256 _id,
    uint256 _amount
  )
    external
    nonReentrant
  {
    //TendiesCard nftContract = TendiesCard(nftAddress);
    //nftContract.mint(_toAddress, id, _amount, _data);
  }


  function _mint(
    uint256 _optionId,
    address _toAddress,
    uint256 _amount,
    bytes memory //_data
  )
    internal
    nonReentrant
  {
    // Load settings for this box option
    OptionSettings memory settings = optionToSettings[_optionId];

    require(settings.maxQuantityPerOpen > 0, "TendiesBox#_mint: OPTION_NOT_ALLOWED");
    require(hasRole(MINTER_ROLE, _msgSender()), "Caller is not minter");

    // Keep track of total number of items minted
    uint256 totalMinted = 0;

    // Iterate over the quantity of boxes specified
    for (uint256 i = 0; i < _amount; i++) {
      uint256 quantitySent = 0;

      uint256 arrIndex = 0;
      uint256[] memory tokenIdsToMint = new uint256[](settings.maxQuantityPerOpen);
      uint256[] memory quantitiesToMint = new uint256[](settings.maxQuantityPerOpen);

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

      // Process non-guaranteed ids
      while (quantitySent < settings.maxQuantityPerOpen) {
        uint256 quantityOfRandomized = 1;
        Class class = _pickRandomClass(settings.classProbabilities);

        // Keep track of token IDs we're minting and their quantities
        if (arrIndex < settings.maxQuantityPerOpen) {
          tokenIdsToMint[arrIndex] = _pickRandomAvailableTokenIdForClass(class);
          quantitiesToMint[arrIndex] = quantityOfRandomized;
          arrIndex++;

          quantitySent += quantityOfRandomized;
        }
      }

      // Mint all of the tokens
      TendiesCard nftContract = TendiesCard(nftAddress);
      nftContract.mintBatch(_toAddress, tokenIdsToMint, quantitiesToMint, "");

      totalMinted += quantitySent;
    }

    // Event emissions
    emit BoxOpened(_optionId, _toAddress, _amount, totalMinted);
  }


  function setClassForTokenId(
    uint256 _tokenId,
    uint256 _classId
  )
    public
    onlyOwner
  {
    _addTokenIdToClass(Class(_classId), _tokenId);
  }


  function setTokenIdsForClass(
    Class _class,
    uint256[] memory _tokenIds
  )
    public
    onlyOwner
  {
    uint256 classId = uint256(_class);
    classToTokenIds[classId] = _tokenIds;
  }


  function resetClass(
    uint256 _classId
  )
    public
    onlyOwner
  {
    delete classToTokenIds[_classId];
  }


  function setTokenIdsForClasses(
    uint256[NUM_CLASSES] memory _tokenIds
  )
    public
    onlyOwner
  {
    for (uint256 i = 0; i < _tokenIds.length; i++) {
      Class class = Class(i);
      _addTokenIdToClass(class, _tokenIds[i]);
    }
  }


  function _addTokenIdToClass(
    Class _class,
    uint256 _tokenId
  )
    internal
  {
    uint256 classId = uint256(_class);
    classToTokenIds[classId].push(_tokenId);
  }


  function setOptionSettings(
    uint256 _optionId,
    uint256 _maxQuantityPerOpen,
    uint16[NUM_CLASSES] memory _classProbabilities,
    uint16[NUM_CLASSES] memory _guarantees
  )
    public
    onlyOwner
  {

    // Allow us to skip guarantees and save gas at mint time
    // if there are no classes with guarantees
    bool hasGuaranteedClasses = false;
    for (uint256 i = 0; i < _guarantees.length; i++) {
      if (_guarantees[i] > 0) {
        hasGuaranteedClasses = true;
      }
    }

    OptionSettings memory settings = OptionSettings({
      maxQuantityPerOpen: _maxQuantityPerOpen,
      classProbabilities: _classProbabilities,
      hasGuaranteedClasses: hasGuaranteedClasses,
      guarantees: _guarantees
    });

    optionToSettings[_optionId] = settings;
  }

  /////
  // HELPER FUNCTIONS
  /////


  function _pickRandomClass(
    uint16[NUM_CLASSES] memory _classProbabilities
  )
    internal
    returns (Class)
  {
    uint16 value = uint16(_random().mod(INVERSE_BASIS_POINT));

    // Start at top class (length - 1)
    // skip common (0), we default to it
    for (uint256 i = _classProbabilities.length - 1; i > 0; i--) {
      uint16 probability = _classProbabilities[i];
      if (value < probability) {
        return Class(i);
      } else {
        value = value - probability;
      }
    }

    return Class.Common;
  }


  function _pickRandomAvailableTokenIdForClass(
    Class _class
  )
    internal
    returns (uint256)
  {
    uint256 classId = uint256(_class);
    uint256[] memory tokenIds = classToTokenIds[classId];

    if (tokenIds.length == 0) {
      return 0;
    }

    uint256 randIndex = _random().mod(tokenIds.length);
    return tokenIds[randIndex];
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
  */
}
