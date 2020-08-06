// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TendiesWrapper
 * TendiesWrapper - a contract to wrap the $TEND contract
 * to allow for calling $TEND functions and mint packs
 */
contract TendiesWrapper is Ownable
{
  address public tendAddress;
  address public boxAddress;

  constructor(
    address _tendAddress,
    address _boxAddress
  )
    Ownable()
    public
  {
    tendAddress = _tendAddress;
    boxAddress = _boxAddress;
  }

  function setTendAddress(
    address _address
  )
    external
    onlyOwner
  {
    require(_address != address(0), "Can't set zero address");
    tendAddress = _address;
  }

  function setBoxAddress(
    address _address
  )
    external
    onlyOwner
  {
    require(_address != address(0), "Can't set zero address");
    boxAddress = _address;
  }

}
