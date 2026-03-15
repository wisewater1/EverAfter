// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IWiseGoldPolicyController} from "./interfaces/IWiseGoldPolicyController.sol";

contract WiseGoldCCIPTreasurySender is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    IRouterClient public immutable router;
    IERC20 public immutable wgold;
    IERC20 public immutable linkToken;
    IWiseGoldPolicyController public policyController;

    mapping(uint64 => bytes) public destinationReceivers;
    mapping(uint64 => bytes) public destinationExtraArgs;

    event DestinationConfigured(uint64 indexed destinationChainSelector, bytes receiver, bytes extraArgs);
    event PolicyControllerUpdated(address indexed previousController, address indexed newController);
    event WGoldBridged(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address indexed initiatedBy,
        address receiver,
        uint256 amount,
        uint256 fee
    );

    error UnsupportedDestinationChain(uint64 destinationChainSelector);
    error InvalidReceiver();

    constructor(
        address admin,
        address routerAddress,
        address wgoldToken,
        address linkTokenAddress,
        address policyControllerAddress
    ) {
        router = IRouterClient(routerAddress);
        wgold = IERC20(wgoldToken);
        linkToken = IERC20(linkTokenAddress);
        policyController = IWiseGoldPolicyController(policyControllerAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BRIDGE_OPERATOR_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);

        wgold.forceApprove(routerAddress, type(uint256).max);
        linkToken.forceApprove(routerAddress, type(uint256).max);
    }

    function setPolicyController(address newPolicyController) external onlyRole(CONFIG_ROLE) {
        address previous = address(policyController);
        policyController = IWiseGoldPolicyController(newPolicyController);
        emit PolicyControllerUpdated(previous, newPolicyController);
    }

    function configureDestination(
        uint64 destinationChainSelector,
        address receiver,
        uint256 gasLimit
    ) external onlyRole(CONFIG_ROLE) {
        if (receiver == address(0)) revert InvalidReceiver();

        destinationReceivers[destinationChainSelector] = abi.encode(receiver);
        destinationExtraArgs[destinationChainSelector] = Client._argsToBytes(
            Client.GenericExtraArgsV2({
                gasLimit: gasLimit,
                allowOutOfOrderExecution: true
            })
        );

        emit DestinationConfigured(
            destinationChainSelector,
            destinationReceivers[destinationChainSelector],
            destinationExtraArgs[destinationChainSelector]
        );
    }

    function quoteBridgeFee(uint64 destinationChainSelector, uint256 amount) public view returns (uint256) {
        Client.EVM2AnyMessage memory message = _buildMessage(destinationChainSelector, amount);
        return router.getFee(destinationChainSelector, message);
    }

    function bridgeWGold(
        uint64 destinationChainSelector,
        address receiver,
        uint256 amount
    ) external onlyRole(BRIDGE_OPERATOR_ROLE) returns (bytes32 messageId) {
        if (destinationReceivers[destinationChainSelector].length == 0) {
            if (receiver == address(0)) revert UnsupportedDestinationChain(destinationChainSelector);
            destinationReceivers[destinationChainSelector] = abi.encode(receiver);
        }

        if (address(policyController) != address(0)) {
            policyController.enforceBridgePolicy(msg.sender, bytes32(0), amount, destinationChainSelector);
        }

        wgold.safeTransferFrom(msg.sender, address(this), amount);

        Client.EVM2AnyMessage memory message = _buildMessage(destinationChainSelector, amount);
        uint256 fee = router.getFee(destinationChainSelector, message);
        messageId = router.ccipSend(destinationChainSelector, message);

        emit WGoldBridged(
            messageId,
            destinationChainSelector,
            msg.sender,
            receiver,
            amount,
            fee
        );
    }

    function _buildMessage(uint64 destinationChainSelector, uint256 amount)
        internal
        view
        returns (Client.EVM2AnyMessage memory)
    {
        if (destinationReceivers[destinationChainSelector].length == 0) {
            revert UnsupportedDestinationChain(destinationChainSelector);
        }

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: address(wgold),
            amount: amount
        });

        return Client.EVM2AnyMessage({
            receiver: destinationReceivers[destinationChainSelector],
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: address(linkToken),
            extraArgs: destinationExtraArgs[destinationChainSelector]
        });
    }
}
