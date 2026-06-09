// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWiseGoldPolicyController {
    function enforceBridgePolicy(address account, bytes32 covenantKey, uint256 amount, uint64 destinationChainSelector)
        external
        view
        returns (uint256 effectiveLimit);
}
