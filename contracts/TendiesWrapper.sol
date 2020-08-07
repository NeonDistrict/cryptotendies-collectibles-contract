// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./tend/TendToken.sol";
import "./TendiesBox.sol";

/**
 * @title TendiesWrapper
 * TendiesWrapper - a contract to wrap the $TEND contract
 * to allow for calling $TEND functions and mint packs
 */
contract TendiesWrapper is Ownable
{
  using SafeERC20 for ERC20;
  using SafeMath for uint256;

  ERC20 public tendiesContractERC20;
  TendToken public tendiesContract;
  TendiesBox public boxContract;

  uint256 GRILL_POOL_BOX_ID;
  uint256 GRILL_POOL_BOX_AMOUNT;

  constructor(
    address _tendAddress,
    address _boxAddress,
    uint256 _initialGrillBoxId,
    uint256 _initialGrillBoxAmount
  )
    Ownable()
    public
  {
    tendiesContract = TendToken(_tendAddress);
    tendiesContractERC20 = ERC20(_tendAddress);
    boxContract = TendiesBox(_boxAddress);

    GRILL_POOL_BOX_ID = _initialGrillBoxId;
    GRILL_POOL_BOX_AMOUNT = _initialGrillBoxAmount;
  }

/**
 * Only Owner Functions
 **/

  function setTendiesAddress(
    address _address
  )
    external
    onlyOwner
  {
    require(_address != address(0), "Can't set zero address");
    tendiesContract = TendToken(_address);
    tendiesContractERC20 = ERC20(_address);
  }

  function setBoxAddress(
    address _address
  )
    external
    onlyOwner
  {
    require(_address != address(0), "Can't set zero address");
    boxContract = TendiesBox(_address);
  }

  function setGrillPoolBox(
    uint256 _boxId,
    uint256 _boxAmount
  )
    external
    onlyOwner
  {
    require(_boxId > 0 && _boxAmount > 0, "Can't set zero ID or amount");
    GRILL_POOL_BOX_ID = _boxId;
    GRILL_POOL_BOX_AMOUNT = _boxAmount;
  }

/**
 * Wrapper Functions
 **/

  function grillPool() public {
    // Grill the pool and send all Tendies to the caller
    tendiesContract.grillPool();
    tendiesContractERC20.safeTransfer(_msgSender(), tendiesContractERC20.balanceOf(address(this)));

    // Mint a pack to the caller
    boxContract.mint(_msgSender(), GRILL_POOL_BOX_ID, GRILL_POOL_BOX_AMOUNT, "");
  }

}
