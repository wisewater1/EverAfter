// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title LivingWill
 * @dev A Chainlink Automation-compatible contract that manages biometric "Proof-of-Life"
 * and automaticaly redistributes to heirs if a citizen fails to check in for 365 days.
 */
contract LivingWill is Ownable, AutomationCompatibleInterface {
    
    IERC20 public wgoldToken;
    address public mannaPool;
    
    uint256 public constant TIMEOUT_DURATION = 365 days;
    
    struct Will {
        address citizen;
        address heir;
        uint256 lastHeartbeat;
        uint256 assetBalance;
        bool isActive;
    }
    
    mapping(address => Will) public citizenWills;
    address[] public activeCitizens;
    
    event HeartbeatRegistered(address indexed citizen, uint256 timestamp);
    event WillExecuted(address indexed citizen, address indexed heir, uint256 heirAmount, uint256 poolAmount);
    event WillCreated(address indexed citizen, address indexed heir);

    constructor(address _wgoldToken, address _mannaPool) Ownable(msg.sender) {
        wgoldToken = IERC20(_wgoldToken);
        mannaPool = _mannaPool;
    }

    /**
     * @dev User creates their Living Will and deposits WGOLD
     */
    function initializeWill(address _heir, uint256 _amount) external {
        require(citizenWills[msg.sender].isActive == false, "Will already active");
        require(wgoldToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        citizenWills[msg.sender] = Will({
            citizen: msg.sender,
            heir: _heir,
            lastHeartbeat: block.timestamp,
            assetBalance: _amount,
            isActive: true
        });
        
        activeCitizens.push(msg.sender);
        emit WillCreated(msg.sender, _heir);
    }
    
    /**
     * @dev Daily checkin from EverAfter AI backend (Biometric Verification)
     */
    function recordHeartbeat(address _citizen) external {
        // In production, require signature verification from EverAfter Oracle
        require(citizenWills[_citizen].isActive == true, "No active will");
        citizenWills[_citizen].lastHeartbeat = block.timestamp;
        
        emit HeartbeatRegistered(_citizen, block.timestamp);
    }

    /**
     * @dev Chainlink Automation uses this to check if any wills need executing
     */
    function checkUpkeep(bytes calldata /* checkData */) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        // Loop to find first eligible execution (simplified for gas limits)
        for (uint i = 0; i < activeCitizens.length; i++) {
            address citizen = activeCitizens[i];
            Will memory willData = citizenWills[citizen];
            
            if (willData.isActive && (block.timestamp > willData.lastHeartbeat + TIMEOUT_DURATION)) {
                return (true, abi.encode(citizen));
            }
        }
        return (false, "");
    }

    /**
     * @dev Chainlink Automation calls this to execute the redistribution
     */
    function performUpkeep(bytes calldata performData) external override {
        address deceasedCitizen = abi.decode(performData, (address));
        Will storage willData = citizenWills[deceasedCitizen];
        
        require(willData.isActive, "Already executed");
        require(block.timestamp > willData.lastHeartbeat + TIMEOUT_DURATION, "Citizen still alive");
        
        // Mark as executed
        willData.isActive = false;
        
        uint256 totalAmount = willData.assetBalance;
        uint256 heirShare = totalAmount / 2;
        uint256 poolShare = totalAmount - heirShare;
        
        // 50% to Heir
        require(wgoldToken.transfer(willData.heir, heirShare), "Heir transfer failed");
        
        // 50% to Manna Pool
        require(wgoldToken.transfer(mannaPool, poolShare), "Pool transfer failed");
        
        emit WillExecuted(deceasedCitizen, willData.heir, heirShare, poolShare);
    }
}
