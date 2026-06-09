// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWiseGoldReputationToken {
    function syncReputation(address account, uint16 scoreBps, uint40 observedAt) external;
}
