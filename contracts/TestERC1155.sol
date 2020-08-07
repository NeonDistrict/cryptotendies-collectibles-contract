// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./BaseERC1155.sol";

contract TestERC1155 is BaseERC1155
{
  constructor(
    string memory _name,
    string memory _symbol,
    string memory _uri,
    address _proxyRegistryAddress
  )
    BaseERC1155(
      _name,
      _symbol,
      _uri,
      _proxyRegistryAddress
    )
    public
  { }

  function create(
    uint256 _numberToCreate
  )
    external
  {
    _create(_numberToCreate);
  }
}
