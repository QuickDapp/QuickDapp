# CLAUDE.md - QuickDapp Web3 Variant

## Overview

This is the **Web3 variant** of QuickDapp - a full-featured web application framework with comprehensive blockchain integration. This package includes wallet authentication (SIWE), smart contract deployment, and token management.

**Core Stack**: Bun, ElysiaJS, PostgreSQL/DrizzleORM, GraphQL Yoga, React 19

**Web3 Stack**: Viem, Wagmi, RainbowKit, SIWE (Sign-In with Ethereum)

See the root monorepo `CLAUDE.md` and `docs/` for full documentation.

---

## Package-Specific Notes

### This is a Standalone Package

This package is a **complete, standalone codebase** - not a typical monorepo dependency. It can be:
- Developed independently
- Released as its own downloadable project
- Used as a starting point for Web3 dapps

### Web3 Features Always Enabled

Unlike the base package, this variant:
- Always requires Web3 configuration (WalletConnect, SIWE origins, etc.)
- Uses SIWE for wallet authentication
- Includes smart contract tooling (Hardhat, Foundry)
- Has blockchain workers (chain watching, multicall deployment)

### Required Environment Variables

In addition to base requirements, this package requires:
```
WEB3_WALLETCONNECT_PROJECT_ID=<your-project-id>
WEB3_FACTORY_CONTRACT_ADDRESS=<contract-address>
WEB3_SUPPORTED_CHAINS=anvil,sepolia
WEB3_SERVER_WALLET_PRIVATE_KEY=<private-key>
WEB3_ALLOWED_SIWE_ORIGINS=http://localhost:3000
```

---

## CLI Commands

```bash
bun run dev              # Start development server
bun run build            # Build for production
bun run prod             # Run production server
bun run test             # Run all tests
bun run gen              # Generate types (GraphQL, ABI) and migrations
bun run db push          # Push schema changes to database
bun run lint             # Run Biome linter
```

---

## Key Directories

- `src/shared/contracts/` - Smart contract ABIs and addresses
- `src/shared/abi/` - Generated ABI TypeScript types
- `src/server/lib/chains.ts` - Chain configuration
- `src/server/workers/jobs/watchChain.ts` - Blockchain event watcher
- `src/client/config/web3.ts` - Wagmi/RainbowKit configuration
- `src/client/hooks/` - Web3 React hooks
- `sample-contracts/` - Example Solidity contracts

---

## Authentication

This variant uses **SIWE (Sign-In with Ethereum)** as the primary authentication method:

1. User connects wallet via RainbowKit
2. Server generates SIWE message
3. User signs message with wallet
4. Server verifies signature and creates session

OAuth providers (Google, GitHub, etc.) are also available as secondary options.
