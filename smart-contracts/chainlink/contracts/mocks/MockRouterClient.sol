// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";

contract MockRouterClient is IRouterClient {
    uint256 public fee = 2 ether;
    uint256 public messageCounter;

    function setFee(uint256 newFee) external {
        fee = newFee;
    }

    function isChainSupported(uint64) external pure override returns (bool supported) {
        return true;
    }

    function getFee(uint64, Client.EVM2AnyMessage memory) external view override returns (uint256) {
        return fee;
    }

    function ccipSend(uint64, Client.EVM2AnyMessage calldata) external payable override returns (bytes32) {
        messageCounter += 1;
        return keccak256(abi.encode(messageCounter, block.timestamp, msg.sender));
    }
}
