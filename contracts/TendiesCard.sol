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
}
