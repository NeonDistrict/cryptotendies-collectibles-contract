// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

interface ITendies {
  function balanceOf(address account) external view returns (uint256);
  function grillPool() external;
  function claimRewards() external;
  function unclaimedRewards(address) external returns (uint);
  function getGrillAmount() external view returns (uint);
}
