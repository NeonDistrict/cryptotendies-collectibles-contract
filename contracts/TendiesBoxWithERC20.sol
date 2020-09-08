// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./TendiesBox.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TendiesBoxWithERC20 {
	IERC20 public erc20Contract;
	TendiesBox public tendiesBoxContract;
	address payable withdrawAddress;
	uint256 perPackErc20Distribution;

	constructor(
		address _tendiesBoxContract,
		address _erc20Contract,
		address payable _withdrawAddress,
		uint256 _perPackErc20Distribution
	)
		public
	{
		tendiesBoxContract = TendiesBox(_tendiesBoxContract);
		erc20Contract = IERC20(_erc20Contract);
		withdrawAddress = _withdrawAddress;
		perPackErc20Distribution = _perPackErc20Distribution;
	}

	function withdraw() external {
		require(msg.sender == withdrawAddress, "Not allowed withdraw address");
		erc20Contract.transfer(msg.sender, erc20Contract.balanceOf(address(this)));
	}

	function open(
    	uint256 _boxId,
    	uint256 _amount
    )
    	external
    {
    	// Make sure they have packs to open and we have enough tokens to distribute
		uint256 balance = tendiesBoxContract.balanceOf(msg.sender, _boxId);
		require(balance >= _amount, "Not enough boxes to open");
		require(perPackErc20Distribution <= erc20Contract.balanceOf(address(this)), "Not enough tokens for swap");

		tendiesBoxContract.openFor(_boxId, _amount, msg.sender);
		erc20Contract.transfer(msg.sender, perPackErc20Distribution);
	}
}
