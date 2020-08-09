// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./BaseERC1155.sol";

/**
 * @title TendiesCard
 * TendiesCard - a contract for semi-fungible tokens
 */
contract TendiesCard is BaseERC1155
{
  using SafeMath for uint256;

  uint256 seed;

  mapping (uint256 => uint256[]) public classToTokenIds;
  mapping (uint256 => uint256) public classTokenCounts;

  constructor(
    string memory _uri,
    address _proxyRegistryAddress
  )
    BaseERC1155(
      "Tendies Card",
      "TENDCARD",
      _uri,
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

}
