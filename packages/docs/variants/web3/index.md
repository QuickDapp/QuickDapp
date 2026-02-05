---
order: 90
expanded: true
---

# Web3

The Web3 variant extends the base QuickDapp package with comprehensive blockchain integration. It adds wallet-based authentication, smart contract deployment and interaction, on-chain event monitoring, and token management — everything you need to build a full-featured decentralized application.

## What It Adds

On top of the base package, the Web3 variant introduces:

- **Wallet authentication** via [SIWE](https://login.xyz/) (Sign-In With Ethereum) — users authenticate by signing a message with their wallet
- **Smart contract tooling** — sample ERC20 factory contracts, Foundry for compilation/testing, Hardhat for local blockchain
- **Blockchain clients** on `ServerApp` — `publicClient` for reading chain state, `walletClient` for server-side transactions
- **Chain event monitoring** — a background worker that polls for on-chain events and creates user notifications
- **Token management** — hooks and components for creating, transferring, and displaying ERC20 tokens
- **Multicall3 support** — automatic deployment and batched contract reads for efficiency

## Technologies Added

| Technology | Purpose |
|-----------|---------|
| [RainbowKit](https://www.rainbowkit.com/) | Wallet connection UI with multiple wallet support |
| [Wagmi](https://wagmi.sh/) | React hooks for Ethereum interactions |
| [Viem](https://viem.sh/) | TypeScript Ethereum client library |
| [SIWE](https://login.xyz/) | Sign-In With Ethereum standard |
| [Hardhat](https://hardhat.org/) | Local Ethereum blockchain for development |
| [Foundry](https://book.getfoundry.sh/) | Smart contract compilation, testing, and deployment |

## Architecture Differences

The Web3 variant modifies the base architecture in several key areas:

### ServerApp

The `ServerApp` type gains two blockchain client properties:

```typescript
type ServerApp = {
  // ... base properties ...
  publicClient: PublicClient   // Read chain state
  walletClient: WalletClient   // Send transactions
}
```

These are created during bootstrap using the configured chain and RPC endpoint, authenticated with `WEB3_SERVER_WALLET_PRIVATE_KEY`.

### Provider Stack

The frontend wraps the base provider stack with Web3-specific providers:

```
ThemeProvider
  WagmiProvider
    QueryClientProvider
      RainbowKitProvider
        AuthProvider (SIWE-based)
          SocketProvider
            ToastProvider
```

`WagmiProvider` manages wallet connections and chain state. `RainbowKitProvider` provides the wallet connection UI and adapts its theme to match the app's light/dark mode.

### Authentication

The `AuthContext` uses a state machine with 7 statuses instead of the base package's 5:

| Status | Description |
|--------|-------------|
| `IDLE` | No authentication attempt |
| `RESTORING` | Checking for saved session |
| `WAITING_FOR_WALLET` | Token validated, waiting for wallet reconnection |
| `AUTHENTICATING` | SIWE signing in progress |
| `AUTHENTICATED` | Signed in with valid token |
| `REJECTED` | User rejected the signature request |
| `ERROR` | Authentication failed |

### Worker Jobs

Two additional built-in worker jobs:

- `watchChain` — Polls the blockchain for events and processes them through chain filter modules
- `deployMulticall3` — Deploys the Multicall3 contract on local development chains (Anvil) if not already present

## Configuration

The Web3 variant requires additional environment variables beyond the base package:

| Variable | Required | Description |
|----------|----------|-------------|
| `WEB3_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |
| `WEB3_SUPPORTED_CHAINS` | Yes | Comma-separated chain names (e.g., `anvil,sepolia`) |
| `WEB3_SERVER_WALLET_PRIVATE_KEY` | Yes | Server wallet private key for transactions |
| `WEB3_ALLOWED_SIWE_ORIGINS` | Yes | Allowed origins for SIWE domain validation |
| `WEB3_FACTORY_CONTRACT_ADDRESS` | Yes | Deployed ERC20Factory contract address |
| `WEB3_ANVIL_RPC` | No | Custom RPC URL for local Anvil chain |
| `WEB3_MAINNET_RPC` | No | Custom RPC URL for Ethereum mainnet |
| `WEB3_SEPOLIA_RPC` | No | Custom RPC URL for Sepolia testnet |
| `WEB3_BASE_RPC` | No | Custom RPC URL for Base chain |

See [Environment Variables](/environment-variables.md) for the full list including base package variables.
