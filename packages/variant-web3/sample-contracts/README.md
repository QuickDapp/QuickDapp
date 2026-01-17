# Sample Contracts

This directory contains sample smart contracts for local development and testing.

## Overview

- **ERC20Factory.sol**: Factory contract for deploying ERC20 tokens
- **SimpleERC20**: Basic ERC20 token implementation with mint/burn capabilities
- Based on the [QuickDapp contracts](https://github.com/QuickDapp/contracts) ERC20Facet but simplified as a standalone contract

## Quick Start

### 1. Install Foundry (if not already installed)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Start Local Blockchain

From this directory, start the local development blockchain:

```bash
bun devnet.ts
```

This starts **Anvil** (local Ethereum node) with:
- Chain ID: 31337
- RPC URL: http://localhost:8545  
- Block time: 1 second
- Accepts connections from all interfaces

Keep this running in a separate terminal.

### 3. Deploy Sample Contracts

In another terminal, from this directory:

```bash
bun deploy.ts
```

This will:
- Load environment variables using the bootstrap system
- Install OpenZeppelin contracts dependency (if needed)
- Compile the ERC20Factory contract
- Deploy it to the local Anvil instance
- Save the deployment address to `../env.local`

## Scripts

### `devnet.ts` - Local Blockchain

Starts a local Ethereum development network using Anvil.

**Usage:**
```bash
bun devnet.ts
```

**What it does:**
- Starts Anvil with development-friendly settings
- Provides funded test accounts
- Mines blocks every second for fast development
- Shows network configuration and next steps

### `deploy.ts` - Contract Deployment  

Builds and deploys the sample contracts to the configured network.

**Usage:**
```bash
bun deploy.ts
```

**What it does:**
- Uses `../scripts/shared/bootstrap.ts` to load environment variables
- Compiles contracts with Foundry
- Deploys ERC20Factory to the configured RPC endpoint
- Updates `../env.local` with the deployed contract address
- Works with any network (local, testnet, mainnet)

## Verification

After successful deployment, you should see:

1. **Contract deployed message** with the address
2. **Updated `.env.local`** in the parent directory:
   ```
   FACTORY_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

## Development Workflow

### 1. Local Development

```bash
# Terminal 1: Start local blockchain
bun devnet.ts

# Terminal 2: Deploy contracts  
bun deploy.ts

# Terminal 3: Start QuickDapp dev server
cd .. && bun run dev
```

### 2. Network Configuration

To deploy to different networks, update the parent `.env` file:

```bash
# For Sepolia testnet
CHAIN=sepolia
CHAIN_RPC_ENDPOINT=https://sepolia.infura.io/v3/YOUR_KEY

# For local development (default)
CHAIN=anvil
CHAIN_RPC_ENDPOINT=http://localhost:8545
```

### 3. Manual Contract Operations

```bash
# Build contracts only
forge build

# Run contract tests
forge test

# Deploy to specific network with custom private key
forge create src/ERC20Factory.sol:ERC20Factory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Production

These are sample contracts for development only. For production:

1. Deploy your own contracts to your target networks
2. Update `FACTORY_CONTRACT_ADDRESS` in your environment
3. Ensure the contract ABIs are available for code generation

## Contract Details

### ERC20Factory

- Deploys new ERC20 tokens with custom name, symbol, and decimals
- Tracks all deployed tokens with sequential indexing
- Emits events for new token deployments
- Creator becomes the owner of deployed tokens

### SimpleERC20

- Standard ERC20 implementation using OpenZeppelin
- Includes mint/burn functionality for token owner
- Configurable decimals
- Initial supply minted to creator on deployment