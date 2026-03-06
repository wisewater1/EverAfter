// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

/**
 * @title WiseGold (WGOLD)
 * @dev The Sovereign Economy token, deployed as an Omnichain Fungible Token (OFT)
 * allowing seamless bridging between Arbitrum Hub and Solana/Polygon Spokes natively.
 */
contract WiseGold is OFT {
    
    address public sentientPolicyEngine;
    
    // Manna Pool settings
    address public mannaPool;
    uint256 public currentVelocityTaxBps = 50; // 0.5% base tax
    
    event VelocityTaxUpdated(uint256 oldBps, uint256 newBps);
    event PolicyEngineUpdated(address newEngine);

    constructor(
        address _lzEndpoint, 
        address _delegate,
        address _mannaPool
    ) OFT("WiseGold", "WGOLD", _lzEndpoint, _delegate) Ownable(msg.sender) {
        mannaPool = _mannaPool;
        sentientPolicyEngine = msg.sender;
    }

    /**
     * @dev Only the AI Sentient Policy (or backend Oracle) can update the tax rate 
     * based on current systemic stress.
     */
    function updateVelocityTax(uint256 _newBps) external {
        require(msg.sender == sentientPolicyEngine || msg.sender == owner(), "Unauthorized");
        require(_newBps <= 500, "Tax cannot exceed 5%");
        
        uint256 old = currentVelocityTaxBps;
        currentVelocityTaxBps = _newBps;
        
        emit VelocityTaxUpdated(old, _newBps);
    }
    
    /**
     * @dev Set the address of the AI Sentient Policy Engine that controls the economy.
     */
    function setPolicyEngine(address _engine) external onlyOwner {
        sentientPolicyEngine = _engine;
        emit PolicyEngineUpdated(_engine);
    }

    /**
     * @dev Overridden transfer function to implement the dynamic Velocity Tax
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        // Do not tax mints, burns, or transfers to/from the Manna Pool
        if (from == address(0) || to == address(0) || from == mannaPool || to == mannaPool) {
            super._update(from, to, value);
            return;
        }

        uint256 taxAmount = (value * currentVelocityTaxBps) / 10000;
        uint256 sendAmount = value - taxAmount;

        // Send the tax to the Manna Pool for daily algorithmic redistribution
        if (taxAmount > 0) {
            super._update(from, mannaPool, taxAmount);
        }
        
        // Send the remainder to the recipient
        super._update(from, to, sendAmount);
    }
    
    /**
     * @dev Mints new WGOLD to the Manna Pool (Controlled by AI Policy)
     */
    function mintManna(uint256 amount) external {
        require(msg.sender == sentientPolicyEngine || msg.sender == owner(), "Unauthorized");
        _mint(mannaPool, amount);
    }
}
