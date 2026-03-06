// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SovereignCovenant
 * @dev A multi-sig Vault requiring Biometric Quorum via Account Abstraction schemas.
 * Represents a shared Family Vault controlled by multiple guardians.
 */
contract SovereignCovenant {
    using ECDSA for bytes32;

    IERC20 public wgoldToken;
    
    address[] public guardians;
    mapping(address => bool) public isGuardian;
    uint256 public requiredQuorum;

    struct WithdrawalRequest {
        address to;
        uint256 amount;
        string justification; // Encrypted IPFS CID
        uint256 approvals;
        bool executed;
        mapping(address => bool) hasApproved;
    }

    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    uint256 public requestCount;

    event CovenantFormed(address[] guardians, uint256 requiredQuorum);
    event WithdrawalRequested(uint256 indexed requestId, address to, uint256 amount);
    event WithdrawalApproved(uint256 indexed requestId, address guardian);
    event WithdrawalExecuted(uint256 indexed requestId);

    constructor(address _wgoldToken, address[] memory _guardians, uint256 _requiredQuorum) {
        require(_guardians.length > 0, "Requires at least 1 guardian");
        require(_requiredQuorum > 0 && _requiredQuorum <= _guardians.length, "Invalid quorum");
        
        wgoldToken = IERC20(_wgoldToken);
        requiredQuorum = _requiredQuorum;

        for (uint i = 0; i < _guardians.length; i++) {
            require(_guardians[i] != address(0), "Invalid address");
            require(!isGuardian[_guardians[i]], "Duplicate guardian");
            
            isGuardian[_guardians[i]] = true;
            guardians.push(_guardians[i]);
        }
        
        emit CovenantFormed(_guardians, _requiredQuorum);
    }

    modifier onlyGuardian() {
        require(isGuardian[msg.sender], "Not a guardian");
        _;
    }

    /**
     * @dev Guardian proposes withdrawing funds from the vault
     */
    function requestWithdrawal(address _to, uint256 _amount, string calldata _justificationCid) external onlyGuardian returns (uint256) {
        uint256 reqId = requestCount++;
        WithdrawalRequest storage req = withdrawalRequests[reqId];
        req.to = _to;
        req.amount = _amount;
        req.justification = _justificationCid;
        req.executed = false;
        
        // Auto-approve by creator
        req.hasApproved[msg.sender] = true;
        req.approvals = 1;

        emit WithdrawalRequested(reqId, _to, _amount);
        emit WithdrawalApproved(reqId, msg.sender);
        
        return reqId;
    }

    /**
     * @dev Other guardians approve the request (Biometric signatures handled via AA frontend)
     */
    function approveWithdrawal(uint256 _requestId) external onlyGuardian {
        WithdrawalRequest storage req = withdrawalRequests[_requestId];
        require(!req.executed, "Already executed");
        require(!req.hasApproved[msg.sender], "Already approved");

        req.hasApproved[msg.sender] = true;
        req.approvals += 1;

        emit WithdrawalApproved(_requestId, msg.sender);

        // Auto execute if quorum is reached
        if (req.approvals >= requiredQuorum) {
            executeWithdrawal(_requestId);
        }
    }

    /**
     * @dev Executes the transfer once quorum is met
     */
    function executeWithdrawal(uint256 _requestId) internal {
        WithdrawalRequest storage req = withdrawalRequests[_requestId];
        require(req.approvals >= requiredQuorum, "Quorum not met");
        require(!req.executed, "Already executed");

        req.executed = true;
        require(wgoldToken.transfer(req.to, req.amount), "Transfer failed");

        emit WithdrawalExecuted(_requestId);
    }
}
