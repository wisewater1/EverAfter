// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IWiseGoldCovenantVerifier} from "./interfaces/IWiseGoldCovenantVerifier.sol";

contract WiseGoldBackendCovenantVerifier is AccessControl, IWiseGoldCovenantVerifier {
    bytes32 public constant ATTESTATION_ADMIN_ROLE = keccak256("ATTESTATION_ADMIN_ROLE");

    struct Attestation {
        bool active;
        uint64 issuedAt;
        uint64 expiresAt;
        bytes32 covenantKey;
        string proofReference;
    }

    mapping(address => mapping(bytes32 => Attestation)) private s_attestations;
    mapping(address => mapping(bytes32 => bool)) private s_knownCovenant;
    mapping(address => bytes32[]) private s_walletCovenants;

    event AttestationUpserted(
        address indexed wallet,
        bytes32 indexed covenantKey,
        bool active,
        uint64 expiresAt,
        string proofReference
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ATTESTATION_ADMIN_ROLE, admin);
    }

    function upsertAttestation(
        address wallet,
        bytes32 covenantKey,
        bool active,
        uint64 expiresAt,
        string calldata proofReference
    ) external onlyRole(ATTESTATION_ADMIN_ROLE) {
        if (!s_knownCovenant[wallet][covenantKey]) {
            s_knownCovenant[wallet][covenantKey] = true;
            s_walletCovenants[wallet].push(covenantKey);
        }

        s_attestations[wallet][covenantKey] = Attestation({
            active: active,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            covenantKey: covenantKey,
            proofReference: proofReference
        });

        emit AttestationUpserted(wallet, covenantKey, active, expiresAt, proofReference);
    }

    function getAttestation(address wallet, bytes32 covenantKey) external view returns (Attestation memory) {
        return s_attestations[wallet][covenantKey];
    }

    function isWalletAttested(address wallet) external view override returns (bool active, uint64 expiresAt, bytes32 covenantKey) {
        bytes32[] memory covenantKeys = s_walletCovenants[wallet];
        for (uint256 i = 0; i < covenantKeys.length; i++) {
            Attestation memory attestation = s_attestations[wallet][covenantKeys[i]];
            if (_isActive(attestation)) {
                return (true, attestation.expiresAt, attestation.covenantKey);
            }
        }
        return (false, 0, bytes32(0));
    }

    function isWalletAttestedForCovenant(address wallet, bytes32 covenantKey) external view override returns (bool active, uint64 expiresAt) {
        Attestation memory attestation = s_attestations[wallet][covenantKey];
        return (_isActive(attestation), attestation.expiresAt);
    }

    function _isActive(Attestation memory attestation) internal view returns (bool) {
        if (!attestation.active) {
            return false;
        }
        if (attestation.expiresAt == 0) {
            return true;
        }
        return attestation.expiresAt >= block.timestamp;
    }
}
