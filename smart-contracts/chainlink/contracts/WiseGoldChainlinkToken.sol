// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract WiseGoldChainlinkToken is ERC20, AccessControl, Ownable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");
    bytes32 public constant POLICY_ROLE = keccak256("POLICY_ROLE");
    bytes32 public constant POLICY_CONTROLLER_ROLE = keccak256("POLICY_CONTROLLER_ROLE");

    uint16 public constant MAX_BPS = 10_000;

    struct ReputationData {
        uint16 scoreBps;
        uint16 multiplierBps;
        uint40 observedAt;
        uint40 syncedAt;
    }

    AggregatorV3Interface public immutable goldFeed;
    address public mannaTreasury;
    uint16 public velocityTaxBps = 50;

    mapping(address => ReputationData) private s_reputation;

    event ReputationSynced(address indexed account, uint16 scoreBps, uint16 multiplierBps, uint40 observedAt);
    event SocialRewardIssued(address indexed account, uint256 baseAmount, uint256 adjustedAmount, bytes32 indexed reason);
    event PolicyMinted(address indexed account, uint256 amount, bytes32 indexed reason);
    event VelocityTaxUpdated(uint16 previousBps, uint16 newBps);
    event MannaTreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);

    error InvalidBps();
    error TreasuryRequired();

    constructor(
        address initialOwner,
        address initialOracle,
        address initialMannaTreasury,
        address goldFeedAddress
    ) ERC20("WiseGold", "WGOLD") Ownable(initialOwner) {
        if (initialMannaTreasury == address(0)) revert TreasuryRequired();

        goldFeed = AggregatorV3Interface(goldFeedAddress);
        mannaTreasury = initialMannaTreasury;

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ORACLE_ROLE, initialOracle);
        _grantRole(REWARD_DISTRIBUTOR_ROLE, initialOwner);
        _grantRole(POLICY_ROLE, initialOwner);
        _grantRole(POLICY_CONTROLLER_ROLE, initialOwner);
    }

    function setMannaTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert TreasuryRequired();
        address previous = mannaTreasury;
        mannaTreasury = newTreasury;
        emit MannaTreasuryUpdated(previous, newTreasury);
    }

    function setVelocityTaxBps(uint16 newBps) external onlyRole(POLICY_ROLE) {
        if (newBps > 500) revert InvalidBps();
        uint16 previous = velocityTaxBps;
        velocityTaxBps = newBps;
        emit VelocityTaxUpdated(previous, newBps);
    }

    function mintGenesis(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    }

    function latestGoldPrice()
        external
        view
        returns (int256 answer, uint8 decimals, uint256 updatedAt)
    {
        (, answer, , updatedAt, ) = goldFeed.latestRoundData();
        decimals = goldFeed.decimals();
    }

    function getReputation(address account) external view returns (ReputationData memory) {
        return _reputationFor(account);
    }

    function syncReputation(address account, uint16 scoreBps, uint40 observedAt) external onlyRole(ORACLE_ROLE) {
        if (scoreBps > MAX_BPS) revert InvalidBps();

        uint16 multiplierBps = deriveEmissionMultiplierBps(scoreBps);
        s_reputation[account] = ReputationData({
            scoreBps: scoreBps,
            multiplierBps: multiplierBps,
            observedAt: observedAt,
            syncedAt: uint40(block.timestamp)
        });

        emit ReputationSynced(account, scoreBps, multiplierBps, observedAt);
    }

    function quoteSocialReward(address account, uint256 baseAmount) public view returns (uint256) {
        uint16 multiplierBps = _reputationFor(account).multiplierBps;
        return (baseAmount * multiplierBps) / MAX_BPS;
    }

    function issueSocialReward(address account, uint256 baseAmount, bytes32 reason)
        external
        onlyRole(REWARD_DISTRIBUTOR_ROLE)
        returns (uint256 adjustedAmount)
    {
        adjustedAmount = quoteSocialReward(account, baseAmount);
        _mint(account, adjustedAmount);
        emit SocialRewardIssued(account, baseAmount, adjustedAmount, reason);
    }

    function mintPolicy(address account, uint256 amount, bytes32 reason)
        external
        onlyRole(POLICY_CONTROLLER_ROLE)
    {
        _mint(account, amount);
        emit PolicyMinted(account, amount, reason);
    }

    function deriveEmissionMultiplierBps(uint16 scoreBps) public pure returns (uint16) {
        if (scoreBps > MAX_BPS) revert InvalidBps();
        uint256 multiplier = 7000 + ((uint256(scoreBps) * 8000) / MAX_BPS);
        return uint16(multiplier);
    }

    function _reputationFor(address account) internal view returns (ReputationData memory data) {
        data = s_reputation[account];
        if (data.multiplierBps == 0) {
            data = ReputationData({
                scoreBps: 5000,
                multiplierBps: deriveEmissionMultiplierBps(5000),
                observedAt: uint40(block.timestamp),
                syncedAt: 0
            });
        }
    }

    function _update(address from, address to, uint256 value) internal override {
        if (
            from == address(0) ||
            to == address(0) ||
            mannaTreasury == address(0) ||
            from == mannaTreasury ||
            to == mannaTreasury ||
            velocityTaxBps == 0
        ) {
            super._update(from, to, value);
            return;
        }

        uint256 taxAmount = (value * velocityTaxBps) / MAX_BPS;
        uint256 netAmount = value - taxAmount;

        if (taxAmount > 0) {
            super._update(from, mannaTreasury, taxAmount);
        }
        super._update(from, to, netAmount);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
