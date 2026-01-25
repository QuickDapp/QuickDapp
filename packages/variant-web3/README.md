# QuickDapp Web3

A highly opinionated framework for building Web3 dapps with comprehensive blockchain integration.

## Features

- **Wallet Auth**: Sign-In with Ethereum (SIWE)
- **Wallet Connect**: RainbowKit + WalletConnect integration
- **Smart Contracts**: Viem + Wagmi for contract interactions
- **Chain Support**: Multi-chain with configurable networks
- **Database**: PostgreSQL with DrizzleORM
- **API**: GraphQL Yoga with schema-first approach
- **Frontend**: React 19 with TailwindCSS
- **Server**: ElysiaJS with Bun runtime
- **Background Jobs**: Chain watchers and workers

## Quick Start

```bash
# Terminal 1: Start PostgreSQL (keep running)
docker-compose up postgres

# Terminal 2: Run these commands
bun install
cp .env.example .env
bun run db push
bun run gen
bun run dev
```

## Web3 Configuration

After completing the Quick Start, configure Web3-specific settings:

### 1. Deploy the Factory Contract

The token management features require a deployed factory contract.

The project root `.env` has `WEB3_FACTORY_CONTRACT_ADDRESS` pre-configured with the deterministic address that `sample-contracts` deploys to on a fresh local Anvil devnet.

Run these commands in separate terminals alongside your QuickDapp dev server:

```bash
# Terminal 3: Start local blockchain (keep running)
cd sample-contracts
bun devnet.ts

# Terminal 4: Deploy contracts (run once after devnet starts)
cd sample-contracts
bun run deploy
```

If you redeploy on the same devnet instance or deploy to a different address on-chain, create `.env.local` in the project root and set the correct address:

```
WEB3_FACTORY_CONTRACT_ADDRESS=0x... (your deployed address)
```

The deployed address is written to `sample-contracts/deployed.txt` after each deployment.

### 2. Configure SIWE Origins

For wallet authentication to work, add your frontend URL to allowed SIWE origins.

For development (Vite runs on port 5173):
```
WEB3_ALLOWED_SIWE_ORIGINS=http://localhost:3000,http://localhost:5173
```

For production, add your actual domain:
```
WEB3_ALLOWED_SIWE_ORIGINS=https://yourdomain.com
```

### 3. WalletConnect Project ID

Get a free project ID from [WalletConnect Cloud](https://cloud.walletconnect.com):

```
WEB3_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run prod` | Run production server |
| `bun run test` | Run tests |
| `bun run gen` | Generate types and migrations |
| `bun run db push` | Push schema to database |
| `bun run lint` | Run linter |

## Sample Contracts

See [sample-contracts/](./sample-contracts/) for example Solidity contracts and local blockchain setup.

## Documentation

See [quickdapp.xyz](https://quickdapp.xyz) for full documentation.

## License

MIT
