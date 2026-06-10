// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWiseGoldCovenantVerifier {
    function isWalletAttested(address wallet) external view returns (bool active, uint64 expiresAt, bytes32 covenantKey);
    function isWalletAttestedForCovenant(address wallet, bytes32 covenantKey) external view returns (bool active, uint64 expiresAt);
}
