// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AutomationCompatible} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

import {IWiseGoldReputationToken} from "./interfaces/IWiseGoldReputationToken.sol";

contract WiseGoldReputationOracle is FunctionsClient, AutomationCompatible, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;

    struct TrackedUser {
        string userId;
        bool active;
        uint40 lastRequestedAt;
        uint40 lastSyncedAt;
    }

    IWiseGoldReputationToken public immutable token;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit = 300000;
    uint64 public refreshInterval = 1 days;

    string public reputationEndpoint;
    string public requestSource;
    bytes public encryptedSecretsReference;

    address[] private s_trackedWallets;
    mapping(address => TrackedUser) public trackedUsers;
    mapping(bytes32 => address) public requestToWallet;

    event TrackedUserRegistered(address indexed wallet, string indexed userId);
    event TrackedUserDisabled(address indexed wallet);
    event ReputationRequestQueued(bytes32 indexed requestId, address indexed wallet, string indexed userId);
    event ReputationUpdated(bytes32 indexed requestId, address indexed wallet, uint16 reputationBps);
    event ReputationUpdateFailed(bytes32 indexed requestId, address indexed wallet, bytes err);

    error UserNotTracked();
    error EmptySource();
    error EmptyEndpoint();

    constructor(
        address router,
        address tokenAddress,
        bytes32 initialDonId,
        uint64 initialSubscriptionId,
        string memory initialEndpoint,
        string memory initialSource,
        address initialOwner
    ) FunctionsClient(router) Ownable(initialOwner) {
        if (bytes(initialSource).length == 0) revert EmptySource();
        if (bytes(initialEndpoint).length == 0) revert EmptyEndpoint();

        token = IWiseGoldReputationToken(tokenAddress);
        donId = initialDonId;
        subscriptionId = initialSubscriptionId;
        reputationEndpoint = initialEndpoint;
        requestSource = initialSource;
    }

    function trackedWalletCount() external view returns (uint256) {
        return s_trackedWallets.length;
    }

    function setSubscriptionId(uint64 newSubscriptionId) external onlyOwner {
        subscriptionId = newSubscriptionId;
    }

    function setDonId(bytes32 newDonId) external onlyOwner {
        donId = newDonId;
    }

    function setCallbackGasLimit(uint32 newGasLimit) external onlyOwner {
        callbackGasLimit = newGasLimit;
    }

    function setRefreshInterval(uint64 newInterval) external onlyOwner {
        refreshInterval = newInterval;
    }

    function setReputationEndpoint(string calldata newEndpoint) external onlyOwner {
        if (bytes(newEndpoint).length == 0) revert EmptyEndpoint();
        reputationEndpoint = newEndpoint;
    }

    function setRequestSource(string calldata newSource) external onlyOwner {
        if (bytes(newSource).length == 0) revert EmptySource();
        requestSource = newSource;
    }

    function setEncryptedSecretsReference(bytes calldata newReference) external onlyOwner {
        encryptedSecretsReference = newReference;
    }

    function registerTrackedUser(address wallet, string calldata userId) external onlyOwner {
        TrackedUser storage tracked = trackedUsers[wallet];
        if (!tracked.active) {
            s_trackedWallets.push(wallet);
        }

        tracked.userId = userId;
        tracked.active = true;

        emit TrackedUserRegistered(wallet, userId);
    }

    function disableTrackedUser(address wallet) external onlyOwner {
        if (!trackedUsers[wallet].active) revert UserNotTracked();
        trackedUsers[wallet].active = false;
        emit TrackedUserDisabled(wallet);
    }

    function requestReputationUpdate(address wallet) external onlyOwner returns (bytes32) {
        return _requestReputationUpdate(wallet);
    }

    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        for (uint256 i = 0; i < s_trackedWallets.length; i++) {
            address wallet = s_trackedWallets[i];
            TrackedUser storage tracked = trackedUsers[wallet];
            if (!tracked.active) {
                continue;
            }

            if (
                tracked.lastRequestedAt == 0 ||
                block.timestamp - tracked.lastRequestedAt >= refreshInterval
            ) {
                return (true, abi.encode(wallet));
            }
        }

        return (false, bytes(""));
    }

    function performUpkeep(bytes calldata performData) external override {
        address wallet = abi.decode(performData, (address));
        _requestReputationUpdate(wallet);
    }

    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        address wallet = requestToWallet[requestId];
        delete requestToWallet[requestId];

        if (err.length > 0) {
            emit ReputationUpdateFailed(requestId, wallet, err);
            return;
        }

        uint256 rawScore = abi.decode(response, (uint256));
        uint16 boundedScore = uint16(rawScore > 10_000 ? 10_000 : rawScore);

        token.syncReputation(wallet, boundedScore, uint40(block.timestamp));
        trackedUsers[wallet].lastSyncedAt = uint40(block.timestamp);

        emit ReputationUpdated(requestId, wallet, boundedScore);
    }

    function _requestReputationUpdate(address wallet) internal returns (bytes32 requestId) {
        TrackedUser storage tracked = trackedUsers[wallet];
        if (!tracked.active || bytes(tracked.userId).length == 0) revert UserNotTracked();

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(requestSource);

        if (encryptedSecretsReference.length > 0) {
            req.addSecretsReference(encryptedSecretsReference);
        }

        string[] memory args = new string[](2);
        args[0] = reputationEndpoint;
        args[1] = tracked.userId;
        req.setArgs(args);

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            callbackGasLimit,
            donId
        );

        tracked.lastRequestedAt = uint40(block.timestamp);
        requestToWallet[requestId] = wallet;

        emit ReputationRequestQueued(requestId, wallet, tracked.userId);
    }
}
