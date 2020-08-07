// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./BaseERC1155.sol";

/**
 * @title TendiesCard
 * TendiesCard - a contract for semi-fungible tokens
 */
contract TendiesCard is BaseERC1155
{
  using Strings for string;
  using SafeMath for uint256;

  uint256 seed;

  mapping (uint256 => uint256[]) public classToTokenIds;
  mapping (uint256 => uint256) public classTokenCounts;

  constructor(
    address _proxyRegistryAddress
  )
    BaseERC1155(
      "Tendies Card",
      "TENDCARD",
      "https://metadata.tendies.dev/api/card/",
      _proxyRegistryAddress
    )
    public
  { }


/**
 * Only Token Creator Functions
 **/

  function create(
    uint256[] calldata _numbersToCreate,
    uint256[] calldata _classIds
  )
    external
  {
    require(hasRole(CREATOR_ROLE, _msgSender()), "Not a creator");
    require(_numbersToCreate.length == _classIds.length, "Unequal number of elements in arguments");

    for (uint256 classIdx = 0; classIdx < _classIds.length; classIdx++) {
      uint256 _classId = _classIds[classIdx];
      uint256 numTokens = _numbersToCreate[classIdx];

      // Set all of these token IDs to the class
      for (uint256 tokenIdx = 1; tokenIdx <= numTokens; tokenIdx++) {
        classToTokenIds[_classId].push(maxTokenID.add(tokenIdx));
      }

      // Keep track of the latest ID
      classTokenCounts[_classId] = classTokenCounts[_classId].add(numTokens);
      maxTokenID = maxTokenID.add(numTokens);
    }
  }


  function mintRandomOfClass(
    address _toAddress,
    uint256 _classId,
    uint256 _amount
  )
    external
  {
    mint(_toAddress, _pickRandomAvailableTokenIdForClass(_classId), _amount, "");
  }


  function _pickRandomAvailableTokenIdForClass(
    uint256 _classId
  )
    internal
    returns (uint256)
  {
    if (classToTokenIds[_classId].length == 0) {
      return 0;
    }

    uint256 randIndex = _random().mod(classToTokenIds[_classId].length);
    return classToTokenIds[_classId][randIndex];
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
