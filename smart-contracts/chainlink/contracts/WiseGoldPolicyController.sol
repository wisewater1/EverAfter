// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {WiseGoldChainlinkToken} from "./WiseGoldChainlinkToken.sol";
import {IWiseGoldCovenantVerifier} from "./interfaces/IWiseGoldCovenantVerifier.sol";

contract WiseGoldPolicyController is AccessControl {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    bytes32 public constant ORACLE_SYNC_ROLE = keccak256("ORACLE_SYNC_ROLE");
    bytes32 public constant MINT_OPERATOR_ROLE = keccak256("MINT_OPERATOR_ROLE");

    bytes32 public constant REASON_ALLOW = keccak256("ALLOW");
    bytes32 public constant REASON_ATTESTATION_REQUIRED = keccak256("ATTESTATION_REQUIRED");
    bytes32 public constant REASON_LIMIT_EXCEEDED = keccak256("LIMIT_EXCEEDED");
    bytes32 public constant REASON_DESTINATION_NOT_APPROVED = keccak256("DESTINATION_NOT_APPROVED");
    bytes32 public constant REASON_TREASURY_STRESS_LOCK = keccak256("TREASURY_STRESS_LOCK");

    uint16 public constant MAX_BPS = 10_000;

    struct TreasuryPolicyState {
        uint16 taxBps;
        uint16 stressBps;
        uint16 velocityBps;
        uint16 goldDeltaBps;
        uint40 updatedAt;
    }

    WiseGoldChainlinkToken public immutable token;
    IWiseGoldCovenantVerifier public verifier;

    TreasuryPolicyState public treasuryPolicy;

    uint256 public baseMintLimit = 25 ether;
    uint256 public baseWithdrawLimit = 100 ether;
    uint256 public baseBridgeLimit = 50 ether;

    mapping(uint64 => bool) public approvedDestinationChains;

    event TreasuryPolicySynced(uint16 taxBps, uint16 stressBps, uint16 velocityBps, uint16 goldDeltaBps);
    event BaseLimitsUpdated(uint256 mintLimit, uint256 withdrawLimit, uint256 bridgeLimit);
    event DestinationChainUpdated(uint64 indexed selector, bool approved);
    event PolicyMintExecuted(address indexed account, bytes32 indexed covenantKey, uint256 amount, bytes32 reason);

    error PolicyDenied(bytes32 reasonCode, uint256 effectiveLimit);

    constructor(address admin, address tokenAddress, address verifierAddress) {
        token = WiseGoldChainlinkToken(tokenAddress);
        verifier = IWiseGoldCovenantVerifier(verifierAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        _grantRole(ORACLE_SYNC_ROLE, admin);
        _grantRole(MINT_OPERATOR_ROLE, admin);
    }

    function setVerifier(address verifierAddress) external onlyRole(POLICY_ADMIN_ROLE) {
        verifier = IWiseGoldCovenantVerifier(verifierAddress);
    }

    function setBaseLimits(uint256 mintLimit, uint256 withdrawLimit, uint256 bridgeLimit)
        external
        onlyRole(POLICY_ADMIN_ROLE)
    {
        baseMintLimit = mintLimit;
        baseWithdrawLimit = withdrawLimit;
        baseBridgeLimit = bridgeLimit;
        emit BaseLimitsUpdated(mintLimit, withdrawLimit, bridgeLimit);
    }

    function syncTreasuryPolicy(uint16 taxBps, uint16 stressBps, uint16 velocityBps, uint16 goldDeltaBps)
        external
        onlyRole(ORACLE_SYNC_ROLE)
    {
        treasuryPolicy = TreasuryPolicyState({
            taxBps: taxBps,
            stressBps: stressBps,
            velocityBps: velocityBps,
            goldDeltaBps: goldDeltaBps,
            updatedAt: uint40(block.timestamp)
        });
        emit TreasuryPolicySynced(taxBps, stressBps, velocityBps, goldDeltaBps);
    }

    function setApprovedDestinationChain(uint64 selector, bool approved) external onlyRole(POLICY_ADMIN_ROLE) {
        approvedDestinationChains[selector] = approved;
        emit DestinationChainUpdated(selector, approved);
    }

    function quoteMintPolicy(address account, bytes32 covenantKey, uint256 amount)
        external
        view
        returns (bool allowed, uint256 effectiveLimit, bytes32 reasonCode)
    {
        return _evaluate(account, covenantKey, baseMintLimit, amount, 0, false);
    }

    function quoteWithdrawPolicy(address account, bytes32 covenantKey, uint256 amount)
        external
        view
        returns (bool allowed, uint256 effectiveLimit, bytes32 reasonCode)
    {
        return _evaluate(account, covenantKey, baseWithdrawLimit, amount, 0, true);
    }

    function quoteBridgePolicy(address account, bytes32 covenantKey, uint256 amount, uint64 destinationChainSelector)
        external
        view
        returns (bool allowed, uint256 effectiveLimit, bytes32 reasonCode)
    {
        return _evaluate(account, covenantKey, baseBridgeLimit, amount, destinationChainSelector, true);
    }

    function enforceBridgePolicy(address account, bytes32 covenantKey, uint256 amount, uint64 destinationChainSelector)
        external
        view
        returns (uint256 effectiveLimit)
    {
        (bool allowed, uint256 limit, bytes32 reasonCode) = _evaluate(
            account,
            covenantKey,
            baseBridgeLimit,
            amount,
            destinationChainSelector,
            true
        );
        if (!allowed) revert PolicyDenied(reasonCode, limit);
        return limit;
    }

    function policyMint(address account, bytes32 covenantKey, uint256 amount, bytes32 reason)
        external
        onlyRole(MINT_OPERATOR_ROLE)
        returns (uint256 effectiveLimit)
    {
        (bool allowed, uint256 limit, bytes32 reasonCode) = _evaluate(account, covenantKey, baseMintLimit, amount, 0, false);
        if (!allowed) revert PolicyDenied(reasonCode, limit);
        token.mintPolicy(account, amount, reason);
        emit PolicyMintExecuted(account, covenantKey, amount, reason);
        return limit;
    }

    function _evaluate(
        address account,
        bytes32 covenantKey,
        uint256 baseLimit,
        uint256 amount,
        uint64 destinationChainSelector,
        bool sensitiveExit
    ) internal view returns (bool allowed, uint256 effectiveLimit, bytes32 reasonCode) {
        bool attested;
        if (covenantKey == bytes32(0)) {
            (attested,,) = verifier.isWalletAttested(account);
        } else {
            (attested,) = verifier.isWalletAttestedForCovenant(account, covenantKey);
        }

        if (!attested) {
            return (false, 0, REASON_ATTESTATION_REQUIRED);
        }

        if (destinationChainSelector != 0 && !approvedDestinationChains[destinationChainSelector]) {
            return (false, 0, REASON_DESTINATION_NOT_APPROVED);
        }

        if (sensitiveExit && treasuryPolicy.stressBps >= 9000) {
            effectiveLimit = _calculateEffectiveLimit(account, baseLimit);
            return (false, effectiveLimit, REASON_TREASURY_STRESS_LOCK);
        }

        effectiveLimit = _calculateEffectiveLimit(account, baseLimit);
        if (amount > effectiveLimit) {
            return (false, effectiveLimit, REASON_LIMIT_EXCEEDED);
        }

        return (true, effectiveLimit, REASON_ALLOW);
    }

    function _calculateEffectiveLimit(address account, uint256 baseLimit) internal view returns (uint256) {
        WiseGoldChainlinkToken.ReputationData memory reputation = token.getReputation(account);
        uint256 reputationFactorBps = 7500 + uint256(reputation.scoreBps);

        uint256 stressFactorBps = treasuryPolicy.stressBps >= 9000
            ? 3500
            : 10_000 - ((uint256(treasuryPolicy.stressBps) * 55) / 100);
        if (stressFactorBps < 3500) {
            stressFactorBps = 3500;
        }

        uint256 velocityFactorBps = treasuryPolicy.velocityBps >= 15_000
            ? 5000
            : 10_000 - (uint256(treasuryPolicy.velocityBps) / 4);
        if (velocityFactorBps < 5000) {
            velocityFactorBps = 5000;
        }

        return (baseLimit * reputationFactorBps * stressFactorBps * velocityFactorBps) / 1_000_000_000_000;
    }
}
