# Smart Contracts

QuickDapp includes sample smart contracts for local development and testing. These contracts use a simple factory pattern and are designed to be easy to understand and modify for your specific needs.

## Contract Architecture

### Simple Factory Pattern

The sample contracts use a straightforward factory pattern:

* **ERC20Factory** - Deploys new ERC20 tokens with custom parameters
* **SimpleERC20** - Basic ERC20 implementation with mint/burn capabilities
* **Foundry Integration** - Uses Foundry for compilation and testing
* **Bun Scripts** - TypeScript deployment scripts using Bun

### Factory Contract

The ERC20Factory contract handles token deployment:

```solidity
// Sample factory interface
interface IERC20Factory {
    function deployToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) external returns (address tokenAddress);
    
    function getTokenCount() external view returns (uint256);
    
    function getUserTokens(address user) 
        external view returns (address[] memory);
}
```

Note: This deployToken functionality is part of the sample contracts. The QuickDapp application does not expose GraphQL mutations for token deployment or token CRUD. Perform on-chain interactions from the client using viem/wagmi and use WebSockets for real-time updates.

## Development Workflow

### Local Development

The sample contracts are located in `sample-contracts/` directory:

```shell
# Start local blockchain
cd sample-contracts
bun devnet.ts

# Deploy contracts to local network
bun deploy.ts
```

### Contract Structure

```
sample-contracts/
├── src/
│   ├── ERC20Factory.sol       # Factory contract
│   └── SimpleERC20.sol        # ERC20 implementation
├── devnet.ts                  # Local blockchain script
├── deploy.ts                  # Deployment script
├── foundry.toml              # Foundry configuration
└── README.md                 # Contract documentation
```

## Deployment Process

### Local Deployment

For development with local Anvil:

```shell
# Terminal 1: Start local blockchain
cd sample-contracts
bun devnet.ts

# Terminal 2: Deploy contracts
cd sample-contracts  
bun deploy.ts
```

### Testnet Deployment

Deploy to Sepolia testnet:

```shell
# Configure environment
echo "CHAIN=sepolia" >> ../.env.local
echo "CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/YOUR_KEY" >> ../.env.local
echo "SERVER_WALLET_PRIVATE_KEY=0x..." >> ../.env.local

# Deploy to Sepolia
cd sample-contracts
bun deploy.ts
```

### Production Deployment

Deploy to mainnet:

```shell
# Configure production environment  
echo "CHAIN=mainnet" >> ../.env.production
echo "CHAIN_RPC_ENDPOINT=https://mainnet.infura.io/v3/YOUR_KEY" >> ../.env.production
echo "SERVER_WALLET_PRIVATE_KEY=0x..." >> ../.env.production

# Deploy to mainnet
cd sample-contracts
NODE_ENV=production bun deploy.ts
```

## Contract Interaction

### TypeScript Integration

The deployment script automatically updates environment variables:

```typescript
// After deployment, .env.local is updated with:
FACTORY_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Frontend Usage

The main QuickDapp application automatically uses the deployed contract:

```typescript
// Contract address is loaded from environment
const factoryAddress = process.env.FACTORY_CONTRACT_ADDRESS

// ABIs are generated from Foundry build artifacts
import { ERC20Factory_ABI } from '../generated/abis'
```

## Testing

### Contract Tests

Run Foundry tests:

```shell
cd sample-contracts
forge test

# Verbose output
forge test -vvv

# Gas reporting
forge test --gas-report
```

### Integration Testing

The main QuickDapp test suite includes contract interaction tests:

```shell
# Run full integration tests (includes contract deployment)
bun run test
```

## Customization

### Adding Custom Contracts

1. **Create Contract** - Add your Solidity file to `src/`
2. **Update Deployment** - Modify `deploy.ts` to include your contract
3. **Generate ABIs** - Run `forge build` to generate artifacts
4. **Update Frontend** - Import the generated ABI in your application

### Modifying Factory

The factory contract can be extended with additional features:

```solidity
// Example: Add token registry functionality
mapping(address => bool) public isToken;
mapping(address => address[]) public userTokens;

event TokenDeployed(
    address indexed creator,
    address indexed token,
    string name,
    string symbol
);
```

Note: Emitting TokenDeployed is useful for contract indexing and client-side tracking. In QuickDapp, there are no GraphQL subscriptions for this; use WebSockets for realtime notifications and handle on-chain events with viem/wagmi on the client.

## Advanced Usage

### Manual Forge Commands

Direct Foundry commands for advanced operations:

```shell
cd sample-contracts

# Compile contracts
forge build

# Run specific tests
forge test --match-contract ERC20FactoryTest

# Deploy with specific parameters
forge create src/ERC20Factory.sol:ERC20Factory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Contract Verification

Verify contracts on Etherscan:

```shell
# Sepolia verification
forge verify-contract \
  --chain sepolia \
  --compiler-version 0.8.20 \
  $CONTRACT_ADDRESS \
  src/ERC20Factory.sol:ERC20Factory \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Mainnet verification  
forge verify-contract \
  --chain mainnet \
  --compiler-version 0.8.20 \
  $CONTRACT_ADDRESS \
  src/ERC20Factory.sol:ERC20Factory \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Production Considerations

### Security

* **Audit Contracts** - Have contracts audited before mainnet deployment
* **Use Battle-tested Libraries** - Based on OpenZeppelin contracts
* **Test Thoroughly** - Comprehensive testing before production use
* **Gradual Rollout** - Deploy to testnets first

### Gas Optimization

* **Constructor Optimization** - Minimize deployment costs  
* **Function Efficiency** - Optimize frequently called functions
* **Storage Layout** - Efficient storage usage patterns

### Monitoring

* **Event Logging** - Comprehensive event emissions for indexing
* **Error Handling** - Clear error messages and revert reasons
* **Upgrade Planning** - Consider upgrade strategies if needed

## Environment Variables

Contract deployment uses these environment variables:

```bash
# Network Configuration
CHAIN=anvil                              # Network: anvil, sepolia, mainnet
CHAIN_RPC_ENDPOINT=http://localhost:8545 # RPC endpoint URL
SERVER_WALLET_PRIVATE_KEY=0x...          # Deployment wallet private key

# Contract Addresses (auto-updated by deployment)
FACTORY_CONTRACT_ADDRESS=0x...           # Deployed factory address

# Optional: Etherscan verification
ETHERSCAN_API_KEY=...                    # For contract verification
```

The sample contracts provide a solid foundation for token-based dApps while remaining simple enough to understand and modify for your specific requirements.
