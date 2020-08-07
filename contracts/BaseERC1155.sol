// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import "@openzeppelin/contracts/access/AccessControl.sol";
//import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./erc1155-openzeppelin/AccessControl.sol";
import "./erc1155-openzeppelin/ERC1155.sol";

contract OwnableDelegateProxy { }

contract ProxyRegistry {
  mapping(address => OwnableDelegateProxy) public proxies;
}

/**
 * @title BaseERC1155
 * BaseERC1155 - ERC1155 contract that whitelists an operator address,
 * has create and mint functionality, and supports useful standards from OpenZeppelin,
 * like name(), symbol(), and totalSupply()
 */
contract BaseERC1155 is Context, AccessControl, Ownable, ERC1155
{
  using SafeMath for uint256;

  // OpenSea Proxy
  address proxyRegistryAddress;

  // Keep track of the latest token ID & individual supplies
  uint256 public maxTokenID = 0;
  mapping (uint256 => uint256) public totalSupply;

  // Contract name & symbol
  string public name;
  string public symbol;

  // Roles
  bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant CREATOR_ADMIN_ROLE = keccak256("CREATOR_ADMIN_ROLE");
  bytes32 public constant MINTER_ADMIN_ROLE = keccak256("MINTER_ADMIN_ROLE");


  constructor(
    string memory _name,
    string memory _symbol,
    string memory _uri,
    address _proxyRegistryAddress
  )
    ERC1155(_uri)
    public
  {
    name = _name;
    symbol = _symbol;
    proxyRegistryAddress = _proxyRegistryAddress;

    // Set up the owner as the creator and minter
    _setupRole(CREATOR_ROLE, _msgSender());
    _setupRole(MINTER_ROLE, _msgSender());

    // Define specific admin roles for creating tokens and minting them
    _setRoleAdmin(CREATOR_ROLE, CREATOR_ADMIN_ROLE);
    _setRoleAdmin(MINTER_ROLE, MINTER_ADMIN_ROLE);

    // Set the owner as the role admin
    _setupRole(CREATOR_ADMIN_ROLE, _msgSender());
    _setupRole(MINTER_ADMIN_ROLE, _msgSender());
  }


/**
 * Only Token Creator Admin Functions
 **/

  function grantAdmin(
    bytes32 _adminRole,
    address _address
  )
    external
  {
    require(
      (_adminRole == CREATOR_ADMIN_ROLE && hasRole(CREATOR_ADMIN_ROLE, _msgSender())) ||
      (_adminRole == MINTER_ADMIN_ROLE && hasRole(MINTER_ADMIN_ROLE, _msgSender())),
      "Not an admin"
    );

    _grantRole(_adminRole, _address);
  }

  function revokeAdmin(
    bytes32 _adminRole,
    address _address
  )
    external
  {
    require(
      (_adminRole == CREATOR_ADMIN_ROLE && hasRole(CREATOR_ADMIN_ROLE, _msgSender())) ||
      (_adminRole == MINTER_ADMIN_ROLE && hasRole(MINTER_ADMIN_ROLE, _msgSender())),
      "Not an admin"
    );

    _revokeRole(_adminRole, _address);
  }


/**
 * Only Owner Functions
 **/

  function setProxyRegistryAddress(
    address _proxyRegistryAddress
  )
    external
    onlyOwner
  {
    proxyRegistryAddress = _proxyRegistryAddress;
  }


  function setURI(
    string memory _newBaseMetadataURI
  )
    public
    onlyOwner
  {
    _setURI(_newBaseMetadataURI);
  }


/**
 * Only Token Creator Functions
 **/

  // Intentionally virtual to allow for extensions on the terms of creating tokens
  function _create(
    uint256 _numberToCreate
  )
    internal virtual
  {
    require(hasRole(CREATOR_ROLE, _msgSender()), "Not a creator");
    require(_numberToCreate > 0, "Must create at least one token");

    // Keep track of the latest ID
    maxTokenID = maxTokenID.add(_numberToCreate);
  }


/**
 * Only Token Minter Functions
 **/

  function mint(
    address _to,
    uint256 _id,
    uint256 _quantity,
    bytes memory _data
  )
    public
  {
    require(hasRole(MINTER_ROLE, _msgSender()), "Caller is not minter");
    require(_id <= maxTokenID, "Token ID DNE");

    totalSupply[_id] = totalSupply[_id].add(_quantity);

    _mint(_to, _id, _quantity, _data);
  }


  function mintBatch(
    address _to,
    uint256[] memory _ids,
    uint256[] memory _quantities,
    bytes memory _data
  )
    public
  {
    require(hasRole(MINTER_ROLE, _msgSender()), "Caller is not minter");

    for (uint256 i = 0; i < _ids.length; i++) {
      totalSupply[_ids[i]] = totalSupply[_ids[i]].add(_quantities[i]);
    }

    _mintBatch(_to, _ids, _quantities, _data);
  }


  /**
   * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
   */

  function isApprovedForAll(
    address _owner,
    address _operator
  )
    public view override
    returns (bool isOperator)
  {
    // Whitelist OpenSea proxy contract for easy trading.
    if (proxyRegistryAddress != address(0)) {
      ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
      if (address(proxyRegistry.proxies(_owner)) == _operator) {
        return true;
      }
    }

    return super.isApprovedForAll(_owner, _operator);
  }

}
