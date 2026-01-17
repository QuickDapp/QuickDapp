// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error ERC20InvalidInput();

struct ERC20TokenConfig {
    string name;
    string symbol;
    uint8 decimals;
}

/**
 * Simple ERC20 token implementation deployed by the factory
 */
contract SimpleERC20 is ERC20, Ownable {
    uint8 private _decimals;
    
    // Custom event for token transfers with additional metadata
    event TokenTransferred(
        address indexed from,
        address indexed to,
        uint256 value,
        string name,
        string symbol,
        uint8 decimals
    );
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        address owner,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(owner) {
        _decimals = decimals_;
        if (initialSupply > 0) {
            _mint(owner, initialSupply);
        }
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * Override _update to emit our custom TokenTransferred event
     * This will be called for all transfers (including mints and burns)
     */
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        
        // Only emit for actual transfers (not mints or burns)
        if (from != address(0) && to != address(0)) {
            emit TokenTransferred(from, to, value, name(), symbol(), decimals());
        }
    }
}

/**
 * Factory contract for deploying ERC20 tokens
 * Based on QuickDapp ERC20Facet but as a standalone contract
 */
contract ERC20Factory {
    event ERC20NewToken(address indexed token, string name, string symbol, address indexed creator, uint256 initialSupply);
    
    mapping(uint256 => address) public erc20Addresses;
    uint256 public numERC20s;
    
    /**
     * Deploy a new ERC20 token
     */
    function erc20DeployToken(
        ERC20TokenConfig memory config,
        uint256 initialBalance
    ) external returns (address) {
        if (bytes(config.name).length == 0 || bytes(config.symbol).length == 0 || config.decimals == 0) {
            revert ERC20InvalidInput();
        }
        
        // Deploy new ERC20 token
        SimpleERC20 token = new SimpleERC20(
            config.name,
            config.symbol,
            config.decimals,
            msg.sender,
            initialBalance
        );
        
        // Track the token
        numERC20s++;
        erc20Addresses[numERC20s] = address(token);
        
        emit ERC20NewToken(address(token), config.name, config.symbol, msg.sender, initialBalance);
        
        return address(token);
    }
    
    /**
     * Get the number of deployed ERC20 tokens
     */
    function getNumErc20s() external view returns (uint256) {
        return numERC20s;
    }
    
    /**
     * Get ERC20 token address by index (1-indexed)
     */
    function getErc20Address(uint256 index) external view returns (address) {
        require(index > 0 && index <= numERC20s, "Invalid index");
        return erc20Addresses[index];
    }
    
    /**
     * Get all deployed token addresses
     */
    function getAllErc20Addresses() external view returns (address[] memory) {
        address[] memory tokens = new address[](numERC20s);
        for (uint256 i = 1; i <= numERC20s; i++) {
            tokens[i - 1] = erc20Addresses[i];
        }
        return tokens;
    }
}