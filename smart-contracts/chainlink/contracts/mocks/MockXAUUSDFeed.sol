// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockXAUUSDFeed {
    uint8 public immutable decimals = 8;
    int256 private s_answer;
    uint256 private s_updatedAt;

    constructor(int256 initialAnswer) {
        s_answer = initialAnswer;
        s_updatedAt = block.timestamp;
    }

    function setAnswer(int256 newAnswer) external {
        s_answer = newAnswer;
        s_updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        )
    {
        return (1, s_answer, s_updatedAt, s_updatedAt, 1);
    }
}
