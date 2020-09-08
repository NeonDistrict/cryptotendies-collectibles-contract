// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TendERC20.sol";

contract TestERC20 is TendERC20, Ownable {
    using SafeMath for uint256;

    constructor(string memory name, string memory symbol)
    public
    Ownable()
    TendERC20(name, symbol)
    {}

    function mint(address _to, uint256 _amount) public onlyOwner {
        return _mint(_to, _amount);
    }

}